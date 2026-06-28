# Express/API refactor-patronen

## Patroon 1: Middleware extractie

### Wanneer
- Validatie-logica herhaald in meerdere route handlers
- Auth-checks gekopieerd per route
- Error handling (try/catch) in elke handler

### Aanpak
Extraheer herhaalde logica naar middleware-functies. Routes worden declaratief.

```javascript
// VOOR: validatie in elke route
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id < 1) return res.status(400).json({ error: 'Ongeldig ID' });

  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error });

  try {
    await db.update(id, result.data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// NA: middleware chain
router.put('/:id',
  validateParam('id'),
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    await db.update(req.validatedId, req.validatedBody);
    res.json({ ok: true });
  })
);
```

### Middleware helpers

```javascript
function validateParam(name) {
  return (req, res, next) => {
    const value = parseInt(req.params[name]);
    if (isNaN(value) || value < 1) {
      return res.status(400).json({ error: `Ongeldig ${name}` });
    }
    req.validatedId = value;
    next();
  };
}

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Ongeldige invoer',
        details: result.error.issues.map(i => i.message),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

function asyncHandler(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}
```

---

## Patroon 2: Repository pattern

### Wanneer
- Database queries direct in route handlers
- Dezelfde query op meerdere plekken
- Routes niet testbaar zonder database-connectie

### Aanpak
Scheid data-access in een repository module. Routes roepen de repository aan.

```javascript
// VOOR: SQL in route handler
router.get('/', async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT id, name, email FROM Users WHERE isActive = 1');
  res.json(result.recordset);
});

router.get('/:id', async (req, res) => {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', req.params.id)
    .query('SELECT * FROM Users WHERE id = @id');
  res.json(result.recordset[0]);
});

// NA: repository bevat alle queries
// userRepository.js
async function findAll() {
  const pool = await getPool();
  const result = await pool.request()
    .query('SELECT id, name, email FROM Users WHERE isActive = 1');
  return result.recordset;
}

async function findById(id) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', id)
    .query('SELECT * FROM Users WHERE id = @id');
  return result.recordset[0] || null;
}

module.exports = { findAll, findById };

// routes/users.js
const userRepo = require('../repositories/userRepository');

router.get('/', asyncHandler(async (req, res) => {
  res.json(await userRepo.findAll());
}));

router.get('/:id', validateParam('id'), asyncHandler(async (req, res) => {
  const user = await userRepo.findById(req.validatedId);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(user);
}));
```

### Voordelen
- Routes bevatten geen SQL meer
- Repository testbaar met mock database
- Query-wijzigingen op een plek
- Eenvoudig te cachen indien nodig

---

## Patroon 3: Validation layer centralisatie

### Wanneer
- Zod schemas verspreid over route-bestanden
- Gedeelde veld-definities herhaald (bv. email, id, url)
- Inconsistente validatie-regels per route

### Aanpak
Centraliseer alle schemas in een validation module met herbruikbare base schemas.

```javascript
// validation/schemas.js — gedeelde bouwstenen
const { z } = require('zod');

const fields = {
  id: z.coerce.number().int().positive(),
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
  safeUrl: z.string().max(2000).url(),
  role: z.enum(['user', 'admin', 'superuser']),
};

// validation/userSchemas.js — samengesteld per domein
const createUser = z.object({
  email: fields.email,
  name: fields.name,
  role: fields.role.optional(),
});

const updateUser = z.object({
  name: fields.name.optional(),
  role: fields.role.optional(),
  isActive: z.boolean().optional(),
});

module.exports = { createUser, updateUser };
```

### Structuur
```
src/
  validation/
    fields.js          -- herbruikbare veld-schemas
    userSchemas.js     -- user-specifieke schemas
    appSchemas.js      -- app-specifieke schemas
    index.js           -- barrel export
```

---

## Patroon 4: Error handling centralisatie

### Wanneer
- Try/catch blokken herhaald in elke route handler
- Inconsistente error responses (soms 500, soms geen status)
- Error logging verspreid

### Aanpak
Gebruik een centraal error-handling middleware aan het eind van de Express chain.

```javascript
// middleware/errorHandler.js
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const message = status === 500 ? 'Interne serverfout' : err.message;

  if (status === 500) {
    logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  }

  res.status(status).json({ error: message });
}

// Custom error class voor bekende fouten
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, AppError };

// Gebruik in routes
const { AppError } = require('../middleware/errorHandler');

router.get('/:id', asyncHandler(async (req, res) => {
  const item = await repo.findById(req.params.id);
  if (!item) throw new AppError('Niet gevonden', 404);
  res.json(item);
}));

// In server.js (na alle routes)
app.use(errorHandler);
```

---

## Patroon 5: Route handler vereenvoudiging

### Wanneer
- Route handler doet meer dan: valideer, roep service aan, stuur response
- Business logica in de route zelf

### Aanpak
Een route handler volgt altijd dit patroon:

```javascript
// Ideale route handler: max 5-10 regels
router.post('/',
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const result = await service.create(req.validatedBody);
    res.status(201).json(result);
  })
);
```

### Lagenstructuur

```
Request --> Middleware (auth, validatie) --> Route handler --> Service (business logic) --> Repository (data access) --> Database
```

| Laag | Verantwoordelijkheid |
|------|---------------------|
| Middleware | Auth, validatie, rate limiting |
| Route handler | Orchestratie: roep service aan, kies HTTP status |
| Service | Business regels, transformaties, geen HTTP/Express kennis |
| Repository | Database queries, geen business logica |

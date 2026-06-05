#!/bin/bash
echo "Van Bommel App Template — lokale setup"
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env aangemaakt — vul waarden in voor je doorgaat"
else
  echo ".env bestaat al"
fi
npm ci --legacy-peer-deps
npm run migrate:db
echo "Setup klaar! Start met: npm run dev:all"

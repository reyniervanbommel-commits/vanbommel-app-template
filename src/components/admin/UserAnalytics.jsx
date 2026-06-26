import React from 'react';
import {
  makeStyles, tokens, shorthands, Text, Field, Input, Button, Select,
  MessageBar, MessageBarBody, Spinner,
  Table, TableBody, TableCell, TableRow, TableHeader, TableHeaderCell,
} from '@fluentui/react-components';
import { ArrowSync24Regular } from '@fluentui/react-icons';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useAnalyticsData, formatDuration } from '../../hooks/useAnalyticsData';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', ...shorthands.gap('24px') },
  filters: { display: 'flex', ...shorthands.gap('16px'), alignItems: 'flex-end', flexWrap: 'wrap' },
  section: {
    display: 'flex', flexDirection: 'column', ...shorthands.gap('12px'),
    ...shorthands.padding('16px'), backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  chartWrap: { width: '100%', height: '280px', marginTop: '8px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', ...shorthands.gap('12px') },
  statCard: {
    ...shorthands.padding('16px'), backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium), boxShadow: tokens.shadow4,
  },
  statLabel: { color: tokens.colorNeutralForeground3 },
});

export default function UserAnalytics() {
  const styles = useStyles();
  const {
    startDate, setStartDate, endDate, setEndDate,
    selectedUserId, setSelectedUserId,
    loading, error, users,
    loginStats, pageUsage, sessionStats, userLoginStats,
    handleRefresh,
  } = useAnalyticsData();

  return (
    <div className={styles.container}>
      <Text size={600} weight="semibold">Gebruiksanalytics</Text>
      <MessageBar intent="info">
        <MessageBarBody>Data wordt bijgehouden vanaf het moment dat analytics actief is.</MessageBarBody>
      </MessageBar>

      {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}

      <div className={styles.filters}>
        <Field label="Startdatum">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="Einddatum">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Field label="Gebruiker">
          <Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ minWidth: '200px' }}>
            <option value="">Alle gebruikers</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </Select>
        </Field>
        <Button appearance="subtle" icon={<ArrowSync24Regular />} onClick={handleRefresh} disabled={loading} />
      </div>

      {loading && !sessionStats && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spinner size="large" />
          <Text style={{ display: 'block', marginTop: '12px' }}>Data laden...</Text>
        </div>
      )}

      {sessionStats && (
        <div className={styles.section}>
          <Text size={500} weight="semibold">Sessiestatistieken</Text>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <Text size={200} className={styles.statLabel} block>Totaal sessies</Text>
              <Text size={600} weight="semibold">{sessionStats.total_sessions || 0}</Text>
            </div>
            <div className={styles.statCard}>
              <Text size={200} className={styles.statLabel} block>Gem. duur</Text>
              <Text size={600} weight="semibold">{formatDuration(sessionStats.avg_duration_seconds)}</Text>
            </div>
            <div className={styles.statCard}>
              <Text size={200} className={styles.statLabel} block>Min. duur</Text>
              <Text size={600} weight="semibold">{formatDuration(sessionStats.min_duration_seconds)}</Text>
            </div>
            <div className={styles.statCard}>
              <Text size={200} className={styles.statLabel} block>Max. duur</Text>
              <Text size={600} weight="semibold">{formatDuration(sessionStats.max_duration_seconds)}</Text>
            </div>
          </div>
        </div>
      )}

      {loginStats?.by_day?.length > 0 && (
        <div className={styles.section}>
          <Text size={500} weight="semibold">Logins per dag</Text>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={loginStats.by_day}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke={tokens.colorBrandForeground1} name="Logins" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {pageUsage.length > 0 && (
        <div className={styles.section}>
          <Text size={500} weight="semibold">Paginagebruik</Text>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page_name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={tokens.colorBrandForeground1} name="Bezoeken" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Pagina</TableHeaderCell>
                <TableHeaderCell>Bezoeken</TableHeaderCell>
                <TableHeaderCell>Unieke gebruikers</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageUsage.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.page_name}</TableCell>
                  <TableCell>{p.count}</TableCell>
                  <TableCell>{p.unique_users}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {userLoginStats.length > 0 && (
        <div className={styles.section}>
          <Text size={500} weight="semibold">Logins per gebruiker</Text>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userLoginStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user_email" angle={-30} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="login_count" fill={tokens.colorBrandForeground1} name="Logins" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && !sessionStats && pageUsage.length === 0 && userLoginStats.length === 0 && (
        <MessageBar intent="info">
          <MessageBarBody>Nog geen analytics data beschikbaar voor deze periode.</MessageBarBody>
        </MessageBar>
      )}
    </div>
  );
}

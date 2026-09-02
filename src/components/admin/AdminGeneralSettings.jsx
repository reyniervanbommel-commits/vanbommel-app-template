import React from 'react';
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import AdminInfoHint from './AdminInfoHint';
import AdminGeneralTableZoomSettings from './AdminGeneralTableZoomSettings';

const useStyles = makeStyles({
  root: { maxWidth: '720px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  pageHeader: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
  accordion: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  item: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    overflow: 'hidden',
  },
  panel: {
    ...shorthands.padding('0', '16px', '16px'),
  },
});

export default function AdminGeneralSettings() {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <div className={styles.pageHeader}>
        <Text as="h1" size={600} weight="semibold">General</Text>
        <AdminInfoHint
          label="About general settings"
          text="App-wide settings that apply to every user. Open a section to change it."
        />
      </div>

      <Accordion
        className={styles.accordion}
        collapsible
        multiple
        defaultOpenItems={['table-zoom']}
      >
        <AccordionItem className={styles.item} value="table-zoom">
          <AccordionHeader>Table zoom</AccordionHeader>
          <AccordionPanel className={styles.panel}>
            <AdminGeneralTableZoomSettings />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

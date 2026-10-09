import type { Page } from '@playwright/test';

/** The floating panel on the left. */
export const mapPanel = (page: Page) => page.getByRole('complementary', { name: 'Map panel' });

/** Opens a tab of the left panel, from its stripe or from its tab bar. */
export async function openMapPanel(page: Page, tab: string) {
  const selected = mapPanel(page).getByRole('tab', { name: tab, exact: true, selected: true });
  // Clicking the open tab closes the panel, so an open one is left alone.
  if ((await selected.count()) > 0) return mapPanel(page);
  await page
    .getByRole('button', { name: tab, exact: true })
    .or(page.getByRole('tab', { name: tab, exact: true }))
    .click();
  return mapPanel(page);
}

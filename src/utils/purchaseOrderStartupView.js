export function pickStartupView(views, isSupplier) {
  const personalViews = views.filter((view) => view.scope === 'personal');
  const vendorViews = views.filter((view) => view.scope === 'vendor');
  const globalViews = views.filter((view) => view.scope === 'global');

  if (isSupplier) {
    return vendorViews.find((view) => view.isDefault)
      || vendorViews[0]
      || personalViews.find((view) => view.isDefault)
      || personalViews[0]
      || null;
  }

  return personalViews.find((view) => view.isDefault)
    || globalViews.find((view) => view.isDefault)
    || vendorViews.find((view) => view.isDefault)
    || null;
}

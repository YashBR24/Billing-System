import AuthService from '../services/AuthService';

export function getCopsLabel() {
  const user = AuthService.getCurrentUser();
  if (!user) return 'Cops';

  // Check organization object (stored on login/switch)
  const orgLabel = user?.organization?.terminology?.copsLabel;
  if (orgLabel) return orgLabel;

  // Fallback to token payload (decoded JWT may have it at root)
  if (user?.terminology?.copsLabel) return user.terminology.copsLabel;

  return 'Cops';
}

export function getBoxesLabel() {
  const user = AuthService.getCurrentUser();
  if (!user) return 'Boxes';

  const orgLabel = user?.organization?.terminology?.boxesLabel;
  if (orgLabel) return orgLabel;

  if (user?.terminology?.boxesLabel) return user.terminology.boxesLabel;

  return 'Boxes';
}

export function capitalizeLabel(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Debug: call this in browser console to check stored data
export function debugTerminology() {
  const user = AuthService.getCurrentUser();
  console.log('Full user object:', JSON.stringify(user, null, 2));
  console.log('Organization:', user?.organization);
  console.log('Terminology:', user?.organization?.terminology);
  console.log('Cops Label:', getCopsLabel());
  console.log('Boxes Label:', getBoxesLabel());
}

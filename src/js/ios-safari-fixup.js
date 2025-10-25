if (typeof browser === 'undefined') {
  console.log('Fixing up safari onboarding');
  location.reload();
} else {
  console.log('Safari iOS onboarding is ok', browser);
}

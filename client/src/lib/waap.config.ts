// WaaP (Human Wallet) configuration
export const waapInitConfig = {
  config: {
    authenticationMethods: ['email', 'phone', 'social', 'wallet'],
    allowedSocials: ['google', 'twitter', 'discord', 'github'],
    styles: { 
      darkMode: true,
      primaryColor: '#3b82f6' // primary blue from theme
    },
    showSecured: true,
  },
  // useStaging: false, // set to true for testing
};

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
  walletConnectProjectId: '126d93e6740defb2bed36da3e24a5114',
  // useStaging: false, // set to true for testing
};

import type { InitWaaPOptions } from "@human.tech/waap-sdk";

export const waapConfig: InitWaaPOptions = {
  useStaging: false,
  config: {
    allowedSocials: ["google", "twitter", "discord", "github"],
    authenticationMethods: ["email", "phone", "social", "wallet"],
    styles: {
      darkMode: false,
    },
    showSecured: true,
  },
  project: {
    entryTitle: "TrustFlow - Join the Trust Network",
  },
};

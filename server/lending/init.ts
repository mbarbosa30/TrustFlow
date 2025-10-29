import { storage } from "../storage";
import { DEFAULT_LENDING_POLICY } from "./policy";

export async function initializeLendingPolicies() {
  try {
    // Initialize Community 0 (Global Network) with disabled lending by default
    const community0Policy = await storage.getLendingPolicy(0);
    
    if (!community0Policy) {
      console.log("Initializing Community 0 lending policy (disabled by default)...");
      await storage.updateCommunityLendingPolicy(0, DEFAULT_LENDING_POLICY);
      console.log("✓ Community 0 lending policy initialized");
    } else {
      console.log("Community 0 lending policy already exists");
    }
  } catch (error) {
    console.error("Error initializing lending policies:", error);
  }
}

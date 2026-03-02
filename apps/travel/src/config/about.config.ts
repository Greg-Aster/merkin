// About page configuration

import type { AboutConfig } from '../types/aboutconfig';
import { defaultAboutConfig } from '../types/aboutconfig';

// Export the about page configuration
export const aboutConfig: AboutConfig = {
  ...defaultAboutConfig,
  team: {
    ...defaultAboutConfig.team,
    enabled: true,
    title: "About Greg",
    description: "The person behind the trail log, the hike, and the notes.",
    layout: "grid",
    columns: {
      mobile: 1,
      tablet: 1,
      desktop: 1
    },
    showEmail: true,
    showRole: true,
    avatarShape: "rounded"
  },
  content: {
    ...defaultAboutConfig.content,
    enabled: true,
    defaultTitle: "Why This Trail Log Exists",
    showTableOfContents: true
  },
  contact: {
    ...defaultAboutConfig.contact,
    enabled: true,
    title: "Get In Touch",
    description: "Questions about the trail, gear choices, or collaboration? Reach out by email.",
    contactInfo: {
      email: "greg@dndiy.org"
    },
    displayOrder: ["description", "email"]
  }
};

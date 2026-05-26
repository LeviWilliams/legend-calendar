import { StorybookConfig } from "@storybook/react-native";
import { resolve } from "path";

const legendCalendarStories = resolve(
  __dirname,
  "../../../packages/legend-calendar/src/components/**/*.stories.?(ts|tsx|js|jsx)"
);

const exampleStories = resolve(
  __dirname,
  "../src/components/**/*.stories.?(ts|tsx|js|jsx)"
);

const main: StorybookConfig = {
  stories: [legendCalendarStories, exampleStories],
  addons: [
    "@storybook/addon-ondevice-controls",
    "@storybook/addon-ondevice-actions",
  ],
};

export default main;

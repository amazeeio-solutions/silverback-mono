import { ApplicationState } from '@amazeelabs/publisher-shared';
import { IncomingWebhook } from '@slack/webhook';

import { getConfig } from './tools/config';

const processMessage = (notificationText: string): string => {
  const config = getConfig().slackNotifications;
  let result: string = notificationText;

  if (config?.publisherBaseUrl) {
    const publisherStatusLink: string = `<${config.publisherBaseUrl}/___status/|Status>`;
    result = `${result}. ${publisherStatusLink}`;
  }
  if (config?.environmentName) {
    const formattedEnvironment: string = '`' + config.environmentName + '`';
    result = `${formattedEnvironment} ${result}`;
  }
  if (config?.projectName) {
    const formattedProject: string = `*[${config.projectName}]*`;
    result = `${formattedProject} ${result}`;
  }

  return result;
};

const notify = async (notificationText: string): Promise<void> => {
  console.log('📢 Slack notification:', notificationText);
  const config = getConfig().slackNotifications;
  if (!config) {
    return;
  }

  const slackWebhook = new IncomingWebhook(config.webhookUrl);
  await slackWebhook.send({
    username: 'Publisher Bot',
    text: processMessage(notificationText),
    channel: config.channel,
    icon_emoji: ':robot_face:',
  });
};

export const stateNotify = (
  stateHistory: ApplicationState[],
  buildNumber: number,
): void => {
  const state =
    stateHistory[stateHistory.length - 1] || ApplicationState.Starting;
  const previousStates = stateHistory.slice(0, -1);

  if (state === ApplicationState.Error) {
    notify('🛑 Error');
    return;
  }

  if (state === ApplicationState.Fatal) {
    notify('😱 Fatal error');
    return;
  }

  // Notify on the first successful build after a deployment or a clean build.
  if (buildNumber === 1 && state === ApplicationState.Ready) {
    notify('✅ Success');
    return;
  }

  // Notify on the first successful build after a failed build.
  const previousResolution = previousStates.findLast(
    (state) =>
      state === ApplicationState.Error ||
      state === ApplicationState.Fatal ||
      state === ApplicationState.Ready,
  );
  if (
    (previousResolution === ApplicationState.Error ||
      previousResolution === ApplicationState.Fatal) &&
    state === ApplicationState.Ready
  ) {
    notify('✅ Success');
    return;
  }
};

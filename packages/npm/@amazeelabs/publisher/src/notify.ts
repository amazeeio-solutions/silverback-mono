import { ApplicationState } from '@amazeelabs/publisher-shared';
import { IncomingWebhook } from '@slack/webhook';

const slackWebhookUrl = process.env.PUBLISHER_SLACK_WEBHOOK || '';
const slackChannel: string = process.env.PUBLISHER_SLACK_CHANNEL || '';
const slackWebhook = new IncomingWebhook(slackWebhookUrl);
const publisherUrl: string = process.env.PUBLISHER_URL || '';
const lagoonProject: string = process.env.LAGOON_PROJECT || '';
const lagoonEnvironment: string = process.env.LAGOON_ENVIRONMENT || '';

const processMessage = (notificationText: string): string => {
  let result: string = notificationText;

  if (publisherUrl !== '') {
    const publisherStatusLink: string = `<${publisherUrl}/___status/|Status>`;
    result = `${result}. ${publisherStatusLink}`;
  }
  if (lagoonEnvironment !== '') {
    const formattedEnvironment: string = '`' + lagoonEnvironment + '`';
    result = `${formattedEnvironment} ${result}`;
  }
  if (lagoonProject !== '') {
    const formattedProject: string = `*[${lagoonProject}]*`;
    result = `${formattedProject} ${result}`;
  }

  return result;
};

const notify = async (notificationText: string): Promise<void> => {
  console.log('📢 Slack notification:', notificationText);
  if (slackWebhookUrl === '' || slackChannel === '') {
    // Slack webhook and channel are not configured yet.
  } else {
    await slackWebhook.send({
      username: 'Publisher Bot',
      text: processMessage(notificationText),
      channel: slackChannel,
      icon_emoji: ':robot_face:',
    });
  }
};

export const stateNotify = (
  stateHistory: ApplicationState[],
  buildNumber: number,
): void => {
  const state =
    stateHistory[stateHistory.length - 1] || ApplicationState.Starting;

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
  const previousResolution = stateHistory.findLast(
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

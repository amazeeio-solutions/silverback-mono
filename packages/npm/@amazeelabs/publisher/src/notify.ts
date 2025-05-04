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
  if (
    slackWebhookUrl === '' ||
    slackChannel === '' ||
    publisherUrl === '' ||
    lagoonEnvironment === '' ||
    lagoonProject === ''
  ) {
    // Environment is not configured yet, do not notify.
  } else {
    await slackWebhook.send({
      username: 'Publisher Bot',
      text: processMessage(notificationText),
      channel: slackChannel,
      icon_emoji: ':robot_face:',
    });
  }
};

export const stateNotify = (state: ApplicationState): void => {
  if (state === ApplicationState.Error) {
    notify('🛑 Error');
  } else if (state === ApplicationState.Fatal) {
    notify('😱 Fatal error');
  }
};

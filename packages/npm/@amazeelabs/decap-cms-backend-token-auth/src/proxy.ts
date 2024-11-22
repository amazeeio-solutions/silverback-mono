export async function githubProxy(
  request: Request,
  token: string,
  basePath: string,
) {
  const url = new URL(request.url);
  // Remove the base path from the request URL and pass the request to github.
  const path = url.pathname.replace(basePath, '');
  const response = await fetch('https://api.github.com' + path + url.search, {
    method: request.method,
    body: request.body,
    // @ts-expect-error: "duplex" is not in the RequestInit type yet.
    duplex: 'half',
    headers: {
      ...request.headers,
      // Attach the configured token to the request.
      Authorization: `Bearer ${token}`,
    },
  });
  const header = new Headers(response.headers);
  // We have to unzip and modify the content before passing it back to the
  // client. Therefore we have to remove the content-encoding and content-length
  // headers added by github.
  header.delete('content-encoding');
  header.delete('content-length');
  // Replace urls in the response with proxied ones.
  const content = response.body
    ? (await response.text()).replace(
        /https:\/\/api\.github\.com/g,
        url.protocol + '//' + url.host + basePath,
      )
    : null;
  return new Response(content, {
    status: response.status,
    headers: header,
  });
}

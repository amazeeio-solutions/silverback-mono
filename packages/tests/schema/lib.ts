import got from 'got';

export const fetch = (
  query: string,
  server = 'silverback-gatsby',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> =>
  got
    .post(`http://127.0.0.1:8888/${server}`, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': 'aadecf7602d1e19a66dd80d9b86b8fd9',
        // Pass the same headers as @amazeelabs/gatsby-source-silverback does.
        // See getForwardedHeaders function in the mentioned package.
        'X-Forwarded-Proto': 'http',
        'X-Forwarded-Host': '127.0.0.1',
        'X-Forwarded-Port': '8000',
        'SLB-Forwarded-Proto': 'http',
        'SLB-Forwarded-Host': '127.0.0.1',
        'SLB-Forwarded-Port': '8000',
      },
      body: JSON.stringify({
        query,
      }),
    })
    .json();

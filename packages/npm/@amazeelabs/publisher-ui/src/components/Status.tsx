import '../../tailwind.css';

import { ApplicationState } from '@amazeelabs/publisher-shared';
import clsx from 'clsx';
import React, { useEffect } from 'react';

export default function Status({
  status,
}: {
  status: ApplicationState | null;
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (status === ApplicationState.Ready && params.has('dest')) {
      window.location.href = params.get('dest') as string;
    }
  }, [status]);

  let inProgress: boolean | undefined;
  if (
    status === ApplicationState.Updating ||
    status === ApplicationState.Starting
  ) {
    inProgress = true;
  }

  return (
    <div className={'h-screen p-4'}>
      <div className={'flex size-full items-center justify-center bg-gray-900'}>
        <div
          className={
            'mx-auto w-full max-w-[90%] bg-white text-gray-200 shadow-sm md:max-w-lg'
          }
        >
          <div
            className={clsx(
              'relative px-6 text-center font-alt text-lg font-bold uppercase md:text-2xl',
              {
                'pt-32 pb-16 md:pb-20': inProgress,
                'pt-36 pb-12 md:pb-16': !inProgress,
              },
            )}
          >
            {inProgress ? (
              <svg
                version="1.1"
                id="L9"
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                viewBox="0 0 100 100"
                enableBackground="new 0 0 0 0"
                className={'absolute left-8 right-0 top-7 mx-auto w-20'}
              >
                <rect x="20" y="50" width="3" height="14" fill="#00a29a">
                  <animateTransform
                    attributeType="xml"
                    attributeName="transform"
                    type="translate"
                    values="0 0; 0 20; 0 0"
                    begin="0"
                    dur="0.8s"
                    repeatCount="indefinite"
                  ></animateTransform>
                </rect>
                <rect x="30" y="50" width="3" height="14" fill="#00a29a">
                  <animateTransform
                    attributeType="xml"
                    attributeName="transform"
                    type="translate"
                    values="0 0; 0 20; 0 0"
                    begin="0.2s"
                    dur="0.8s"
                    repeatCount="indefinite"
                  ></animateTransform>
                </rect>
                <rect x="40" y="50" width="3" height="14" fill="#00a29a">
                  <animateTransform
                    attributeType="xml"
                    attributeName="transform"
                    type="translate"
                    values="0 0; 0 20; 0 0"
                    begin="0.4s"
                    dur="0.8s"
                    repeatCount="indefinite"
                  ></animateTransform>
                </rect>
              </svg>
            ) : null}
            {status === ApplicationState.Ready ? (
              <svg
                version="1.1"
                className="absolute inset-x-0 top-14 mx-auto w-16"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                x="0px"
                y="0px"
                viewBox="0 0 37 37"
                xmlSpace="preserve"
              >
                <path
                  className="tick-circle"
                  style={{
                    fill: 'none',
                    stroke: '#349D7A',
                    strokeWidth: '1',
                    strokeLinejoin: 'round',
                    strokeMiterlimit: '10',
                  }}
                  d="M30.5,6.5L30.5,6.5c6.6,6.6,6.6,17.4,0,24l0,0c-6.6,6.6-17.4,6.6-24,0l0,0c-6.6-6.6-6.6-17.4,0-24l0,0C13.1-0.2,23.9-0.2,30.5,6.5z"
                />
                <polyline
                  className="tick-path"
                  style={{
                    fill: 'none',
                    stroke: '#349D7A',
                    strokeWidth: '1',
                    strokeLinejoin: 'round',
                    strokeMiterlimit: '10',
                  }}
                  points="11.6,20 15.9,24.2 26.4,13.8 "
                />
              </svg>
            ) : null}
            {status === ApplicationState.Error ? (
              <svg
                className="absolute inset-x-0 top-12 mx-auto w-16 -rotate-90 stroke-[1.5]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
              >
                <circle
                  className="cross-circle stroke-red-500"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                />
                <path
                  className="cross-path stroke-red-500"
                  fill="none"
                  d="M16,16 l20,20"
                />
                <path
                  className="cross-path stroke-red-500"
                  fill="none"
                  d="M16,36 l20,-20"
                />
              </svg>
            ) : null}
            {status === ApplicationState.Starting ? (
              <span>Starting...</span>
            ) : null}
            {status === ApplicationState.Error ? <span>Error!</span> : null}
            {status === ApplicationState.Ready ? <span>Ready!</span> : null}
          </div>
          <div
            className={clsx('h-[3px] w-full overflow-hidden', {
              'bg-yellow-500': inProgress,
              'bg-green-500': status === ApplicationState.Ready,
              'bg-red-500': status === ApplicationState.Error,
            })}
          >
            {inProgress ? (
              <div className="h-[3px] animate-bounce bg-turquoise-500"></div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

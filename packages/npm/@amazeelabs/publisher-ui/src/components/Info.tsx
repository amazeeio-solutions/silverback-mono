import '../../tailwind.css';

import { ApplicationState, BuildModel } from '@amazeelabs/publisher-shared';
import { Dialog, Disclosure, Transition } from '@headlessui/react';
import { bind } from '@react-rxjs/core';
import clsx from 'clsx';
import React, { ComponentProps, Fragment, useState } from 'react';
import { ajax } from 'rxjs/ajax';

import { createWebsocketUrl, useStatus } from '../utils/status';
import Collapsible from './Collapsible';
import SimpleLog from './SimpleLog';

const clean$ = ajax({
  url: '/___status/clean',
  method: 'POST',
});

const build$ = ajax({
  url: '/___status/build',
  method: 'POST',
});

function History({
  historyItems,
}: {
  historyItems: Array<{
    id: number;
    startedAt: number;
    finishedAt: number;
    success: boolean;
    type: string;
  }>;
}) {
  return (
    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-black">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="py-5 pl-0 pr-3 text-left font-alt text-sm font-normal text-turquoise-500"
                >
                  Id
                </th>
                <th
                  scope="col"
                  className="px-3 py-5 text-left font-alt text-sm font-normal text-turquoise-500"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-3 py-5 text-left font-alt text-sm font-normal text-turquoise-500"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left font-alt text-sm font-normal text-turquoise-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left font-alt text-sm font-normal text-turquoise-500"
                >
                  Log
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 bg-white">
              {historyItems.map((item) => {
                const date = new Date();

                const startedAtDate = date.setTime(item.startedAt);
                const convertedDate = new Date(startedAtDate).toLocaleString(
                  window.navigator.language,
                  {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZoneName: 'short',
                  },
                );

                return (
                  <>
                    <Disclosure key={item.id}>
                      {({ open }) => (
                        <>
                          <tr>
                            <td className="whitespace-nowrap py-5 pr-3">
                              {item.id}
                            </td>
                            <td className="whitespace-nowrap px-3 py-5 capitalize">
                              {item.type}
                            </td>
                            <td className="relative whitespace-nowrap py-5 pl-3 pr-4 sm:pr-6">
                              {convertedDate},{' '}
                              {Math.round(
                                (item.finishedAt - item.startedAt) / 1000,
                              )}{' '}
                              sec{' '}
                            </td>
                            <td className="whitespace-nowrap px-3 py-5">
                              <span
                                className={clsx(
                                  'inline-flex rounded-full px-2 text-sm font-medium leading-5',
                                  {
                                    'bg-green-100 text-green-500':
                                      item.success == true,
                                    'bg-red-100 text-red-500':
                                      item.success == false,
                                  },
                                )}
                              >
                                {item.success ? 'Success' : 'Failed'}
                              </span>
                            </td>
                            <td className="whitespace-nowrap py-5">
                              <Disclosure.Button>
                                <div className={'px-3  text-turquoise-500'}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="17"
                                    height="17"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    className={clsx(
                                      '-mt-0.5 ml-2.5 inline cursor-pointer transition',
                                      {
                                        'rotate-180': open,
                                      },
                                    )}
                                    viewBox="0 0 16 16"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                                    />
                                  </svg>
                                </div>
                              </Disclosure.Button>
                            </td>
                          </tr>
                          <tr className={'m-0 !border-0 p-0'}>
                            <td
                              colSpan={5}
                              className={'pre-container m-0 !border-0 p-0'}
                            >
                              <Collapsible
                                show={open}
                                delay={0}
                                fadeDuration={200}
                                scaleDuration={250}
                              >
                                <Disclosure.Panel>
                                  <HistoryLogs id={item.id} />
                                </Disclosure.Panel>
                              </Collapsible>
                            </td>
                          </tr>
                        </>
                      )}
                    </Disclosure>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const [useHistoryItem] = bind(
  (id: number) =>
    ajax.getJSON<BuildModel | undefined>(`/___status/history/${id}`),
  undefined,
);

function HistoryLogs(props: { id: number }) {
  const value = useHistoryItem(props.id);
  return (
    <div>
      <pre>{value ? value.logs : 'Loading...'}</pre>
    </div>
  );
}

function CleanButton() {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <>
      <button className={'button-secondary mb-3'} onClick={openModal}>
        Clean
      </button>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <p className="text-gray-500 text-sm">
                    Please confirm that you definitely want to clean the build:
                  </p>

                  <div className="mt-4">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={closeModal}
                    >
                      No, go back!
                    </button>
                    <button
                      className={'button-secondary'}
                      onClick={() => {
                        clean$.subscribe();
                        closeModal();
                      }}
                    >
                      Yes, do it!
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

function BuildButton() {
  return (
    <button className={'button-primary'} onClick={() => build$.subscribe()}>
      Queue Build
    </button>
  );
}

export function AppStatus() {
  const labels: { [Property in ApplicationState]: string } = {
    [ApplicationState.Error]: 'Error',
    [ApplicationState.Ready]: 'Ready',
    [ApplicationState.Starting]: 'Starting',
    [ApplicationState.Fatal]: 'Fatal',
    [ApplicationState.Updating]: 'Updating',
  };
  const status = useStatus();
  return <span>Status: {status ? labels[status] : 'Unknown'}</span>;
}

function scrollToBuildHistory() {
  const target = document.getElementById('build-history');
  target?.scrollIntoView({ behavior: 'smooth' });
}

export default function Info({
  historyItems,
  isStorybook,
}: {
  historyItems: ComponentProps<typeof History>['historyItems'];
  isStorybook?: boolean;
}) {
  const logsSocket = isStorybook
    ? '__storybook__'
    : createWebsocketUrl('/___status/logs');
  return (
    <div className={'md:m-4'}>
      <div className={'max-w-full bg-gray-900 pb-16 md:pb-24'}>
        <div className={'pb-[12.5rem] pt-20'}>
          <div className="mx-auto flex max-w-screen-2xl justify-between px-4 md:px-6 lg:px-10 xl:px-14">
            <div>
              <BuildButton />
              <CleanButton />
            </div>
            <a
              onClick={scrollToBuildHistory}
              className={
                'hover:text-purple shrink-0 cursor-pointer text-center text-sm font-medium text-purple-500 transition focus:text-white focus:outline-none'
              }
            >
              <span className={'block'}>Build History</span>
              <svg
                className="ml-2 inline size-5"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"
                />
              </svg>
            </a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="158"
              height="14"
              viewBox="0 0 158 14"
              fill="none"
              className={'absolute inset-x-0 top-8 mx-auto md:top-28'}
            >
              <path
                d="M59.5351 2.532V0.931458H48.9348V3.12237H56.0454L48.4756 11.7942V13.421H59.7319V11.2563H51.9522L59.5351 2.532Z"
                fill="#00A29A"
              />
              <path
                d="M37.1275 8.6587L38.4132 5.77246C38.505 5.53631 38.6099 5.28705 38.7149 5.03778C38.8199 4.78852 38.9248 4.52613 39.0298 4.25063C39.1347 3.97512 39.2397 3.71274 39.3315 3.45035C39.4233 3.69962 39.5152 3.962 39.6201 4.22439C39.7251 4.49989 39.83 4.7754 39.935 5.03778C40.0399 5.30017 40.1318 5.5232 40.2236 5.71999L41.5355 8.6587H37.1275ZM38.2164 0.931458L32.6538 13.421H35.0153L36.2354 10.6791H42.4408L43.6609 13.421H46.101L40.5516 0.931458H38.2164Z"
                fill="#00A29A"
              />
              <path
                d="M156.933 8.09457C156.67 7.701 156.316 7.3599 155.857 7.09752C155.398 6.83513 154.86 6.6121 154.256 6.44155C153.653 6.271 152.997 6.13981 152.315 6.03485C151.869 5.96926 151.449 5.87742 151.068 5.79871C150.688 5.70687 150.36 5.60192 150.084 5.45761C149.809 5.32642 149.586 5.15586 149.428 4.95907C149.271 4.76229 149.192 4.53926 149.192 4.27688C149.192 3.96201 149.31 3.68651 149.546 3.45036C149.783 3.22733 150.111 3.05678 150.504 2.93871C150.911 2.82064 151.37 2.75504 151.895 2.75504C152.38 2.75504 152.852 2.82064 153.285 2.93871C153.731 3.0699 154.138 3.25357 154.532 3.50284C154.912 3.7521 155.266 4.05385 155.555 4.40807L156.998 2.82064C156.67 2.37458 156.25 2.00724 155.765 1.69238C155.28 1.37752 154.715 1.14137 154.073 0.970823C153.43 0.800272 152.721 0.721558 151.934 0.721558C151.199 0.721558 150.517 0.813392 149.888 0.983943C149.258 1.15449 148.707 1.40376 148.235 1.71862C147.762 2.03348 147.395 2.42706 147.132 2.88623C146.87 3.34541 146.739 3.85706 146.739 4.4343C146.739 4.98531 146.844 5.45761 147.054 5.87742C147.264 6.29724 147.565 6.65146 147.972 6.96632C148.379 7.28118 148.864 7.53045 149.455 7.72724C150.032 7.92403 150.701 8.08146 151.449 8.19953C151.764 8.25201 152.092 8.30448 152.406 8.35696C152.721 8.42256 153.036 8.48815 153.338 8.56687C153.64 8.64558 153.902 8.75054 154.138 8.88173C154.374 9.01292 154.558 9.15724 154.689 9.32779C154.82 9.49834 154.899 9.70824 154.899 9.94439C154.899 10.2986 154.755 10.6004 154.479 10.8496C154.204 11.0989 153.836 11.2826 153.404 11.4006C152.971 11.5318 152.511 11.5843 152.026 11.5843C151.186 11.5843 150.399 11.4269 149.665 11.0989C148.93 10.7709 148.208 10.2068 147.474 9.4065L146.096 11.2301C146.555 11.7548 147.08 12.1878 147.657 12.5289C148.235 12.87 148.877 13.1324 149.586 13.3292C150.294 13.5128 151.068 13.6047 151.908 13.6047C152.984 13.6047 153.928 13.4472 154.742 13.1193C155.542 12.7913 156.172 12.3321 156.618 11.7286C157.064 11.1251 157.3 10.4167 157.3 9.59017C157.313 8.98669 157.182 8.48815 156.933 8.09457Z"
                fill="#00A29A"
              />
              <path
                d="M65.4519 8.06833H71.8279V5.99549H65.4519V3.03054H72.7331V0.931458H63.1692V13.421H72.8118V11.3088H65.4519V8.06833Z"
                fill="#00A29A"
              />
              <path
                d="M140.888 10.5741C140.691 10.8365 140.415 11.0202 140.061 11.1514C139.707 11.2825 139.287 11.335 138.789 11.335H134.512V8.00273H138.71C139.13 8.00273 139.523 8.05521 139.904 8.17328C140.284 8.29136 140.599 8.46191 140.835 8.69805C141.071 8.9342 141.189 9.24906 141.189 9.64264C141.176 10.01 141.084 10.3117 140.888 10.5741ZM134.499 3.01742H138.316C138.972 3.01742 139.497 3.13549 139.904 3.38476C140.31 3.63402 140.507 3.98824 140.507 4.48677C140.507 4.80163 140.415 5.06402 140.245 5.28705C140.074 5.51007 139.825 5.69374 139.523 5.81182C139.208 5.94301 138.867 5.99549 138.487 5.99549H134.485V3.01742H134.499ZM142.029 7.04503C141.727 6.86136 141.412 6.71705 141.084 6.59897C141.57 6.40218 141.95 6.12668 142.252 5.78558C142.659 5.31329 142.856 4.73604 142.856 4.05384C142.856 3.38476 142.685 2.82063 142.357 2.36146C142.029 1.90228 141.531 1.54806 140.875 1.2988C140.219 1.04953 139.405 0.931458 138.447 0.931458H132.242V13.421H138.789C139.405 13.421 139.996 13.3554 140.56 13.2111C141.124 13.0799 141.635 12.8569 142.082 12.5814C142.528 12.3058 142.882 11.9123 143.131 11.44C143.38 10.9677 143.512 10.3904 143.512 9.70824C143.512 9.10475 143.38 8.57998 143.105 8.13393C142.842 7.68787 142.488 7.32053 142.029 7.04503Z"
                fill="#00A29A"
              />
              <path
                d="M107.21 0.931458H104.888V13.421H113.429V11.2825H107.21V0.931458Z"
                fill="#00A29A"
              />
              <path
                d="M101.149 11.3088H89.8013V13.4079H101.149V11.3088Z"
                fill="#00A29A"
              />
              <path
                d="M80.1981 0.760922C79.0173 1.28569 78.5188 2.49266 78.8468 3.97514C79.1616 5.39202 80.2374 6.07422 80.959 6.53339C81.1689 6.66459 81.4706 6.84826 81.5625 6.96633C81.6674 7.09752 81.6543 7.20248 81.4575 7.22872C81.1164 7.29431 80.3161 7.26807 79.7782 7.24183C78.8074 7.20247 77.7185 7.15 76.7739 7.35991C75.0422 7.74037 74.4912 8.81614 74.3206 9.65578C74.0845 10.889 74.6617 12.0304 75.9212 12.8044C77.0757 13.5128 78.7812 13.9195 80.6179 13.9195C80.6703 13.9195 80.7228 13.9195 80.7753 13.9195C83.491 13.8802 84.9997 13.0274 85.6557 12.5158C86.1411 12.1353 86.2329 11.44 85.8525 10.9546C85.472 10.4692 84.7767 10.3773 84.2913 10.7578C83.5566 11.3219 82.2315 11.6761 80.7491 11.7024C79.3059 11.7286 77.9022 11.4269 77.0888 10.9152C76.4328 10.5085 76.4722 10.1674 76.5247 10.0231C76.5771 9.86568 76.669 9.66889 77.2462 9.55082C77.9153 9.40651 78.8468 9.44587 79.6864 9.48522C81.2082 9.55082 82.5595 9.55082 83.2811 8.56688C83.937 7.66165 83.9633 6.73018 83.5697 5.98239C83.2417 5.36578 82.6645 4.99844 82.1659 4.67046C81.5362 4.26376 81.1426 3.98826 80.9852 3.51596C80.8409 3.06991 81.0114 2.88624 81.1164 2.82065C81.6936 2.41395 84.3044 3.24046 85.6688 5.15587C86.023 5.6544 86.7183 5.77248 87.23 5.41826C87.7285 5.06404 87.8466 4.36872 87.4924 3.85707C85.6819 1.32505 82.2053 -0.144306 80.1981 0.760922Z"
                fill="#00A29A"
              />
              <path
                d="M118.86 11.1907L122.613 4.53926L126.365 11.1907H118.86ZM115.043 13.421H130.169L122.599 0L115.043 13.421Z"
                fill="#00A29A"
              />
              <path
                d="M22.998 10.2461L18.7605 0.931455H16.1891V13.421H18.4981V8.61933C18.4981 7.55667 18.4718 6.59897 18.4325 5.74622C18.4194 5.52319 18.4062 5.31328 18.3931 5.09026L22.1059 13.4079H23.8376L27.6291 5.0509C27.6028 5.30017 27.5897 5.53631 27.5766 5.77246C27.5241 6.63833 27.511 7.58292 27.511 8.60622V13.4079H29.8069V0.918335H27.2749L22.998 10.2461Z"
                fill="#00A29A"
              />
              <path
                d="M2.34835 3.25356H8.31761V8.64558H2.34835V3.25356ZM0.0131201 13.421H2.33523V10.6791H8.30449V13.421H10.6266V0.931458H0V13.421H0.0131201Z"
                fill="#00A29A"
              />
            </svg>
          </div>
        </div>
        <div
          className={'mx-auto mb-8 max-w-7xl px-4 md:px-6 lg:px-10 xl:px-14'}
        >
          <Disclosure defaultOpen>
            {({ open }) => (
              <>
                <div className={'-mt-[7.4rem] mb-8 w-full'}>
                  <div className={'relative w-full text-left'}>
                    <div
                      className={
                        'pr-9 lg:flex lg:items-baseline lg:justify-between'
                      }
                    >
                      <h2
                        className={
                          'mb-6 font-alt text-4xl font-medium tracking-widest text-black'
                        }
                      >
                        Logs
                      </h2>
                      <h3 className={'mb-2'}>
                        <AppStatus />
                      </h3>
                      <Disclosure.Button
                        className={
                          'absolute right-0 top-3.5 text-right text-turquoise-500'
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="17"
                          height="17"
                          fill="currentColor"
                          className={clsx(
                            '-mt-0.5 ml-2.5 inline cursor-pointer transition',
                            {
                              'rotate-180': open,
                            },
                          )}
                          viewBox="0 0 16 16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                          />
                        </svg>
                      </Disclosure.Button>
                    </div>
                  </div>

                  <Collapsible
                    show={open}
                    delay={0}
                    fadeDuration={200}
                    scaleDuration={250}
                  >
                    <Disclosure.Panel className={'pb-20'}>
                      <div style={{ height: 500, marginTop: 5 }}>
                        {logsSocket ? <SimpleLog url={logsSocket} /> : null}
                      </div>
                    </Disclosure.Panel>
                  </Collapsible>
                </div>
              </>
            )}
          </Disclosure>
        </div>
        <div className={'mx-auto max-w-7xl px-4 md:px-6 lg:px-10 xl:px-14'}>
          <div className={'pre-container'} id="build-history">
            <h2
              className={
                'mb-6 font-alt text-4xl font-medium tracking-widest text-black'
              }
            >
              Build History
            </h2>
            <div className={'overflow-hidden bg-white py-4 pl-8 pr-6'}>
              <History historyItems={historyItems} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

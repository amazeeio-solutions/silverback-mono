import React, { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  className?: string;
}>;

export const Row = ({ children, className }: Props) => (
  <td className={`border-4 border-solid ${className}`}>{children}</td>
);

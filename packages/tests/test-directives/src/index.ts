import type {
  SilverbackResolver,
  SilverbackSource,
} from '@amazeelabs/gatsby-source-silverback';

type Contact = {
  name: string;
  email: string;
};

type Employee = {
  __typename: 'Employee';
  id: string;
  role: string;
} & Contact;

type Customer = {
  __typename: 'Customer';
  id: string;
} & Contact;

export const echo: SilverbackResolver = (_, { msg }: { msg: string }) =>
  new Promise((resolve) => resolve(msg));

export const sourceEmployees: SilverbackSource<Employee> = () => {
  return [
    [
      'john',
      {
        __typename: 'Employee',
        id: 'john',
        name: 'John Doe',
        email: 'john.doe@my.company',
        role: 'developer',
      },
    ],
    [
      'jane',
      {
        __typename: 'Employee',
        id: 'jane',
        name: 'Jane Doe',
        email: 'jane.doe@my.company',
        role: 'ceo',
      },
    ],
  ];
};

export const sourceCustomers: SilverbackSource<Customer> = () => {
  return [
    [
      'frank',
      {
        __typename: 'Customer',
        id: 'frank',
        name: 'Frank Sinatra',
        email: 'frank@another.company',
      },
    ],
    [
      'elvis',
      {
        __typename: 'Customer',
        id: 'elvis',
        name: 'Elvis Presley',
        email: 'elvis@another.company',
      },
    ],
  ];
};

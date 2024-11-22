import { Decorator, Meta, StoryFn, StoryObj } from '@storybook/react';
import { pick } from 'lodash';

import LandscapeOriginal from '../assets/landscape.jpg?metadata';
import LandscapeSmallJpeg from '../assets/landscape.jpg?w=1000&tint=aa0000&metadata';
import LandscapeSmallWebp from '../assets/landscape.jpg?w=1000&webp&tint=aa0000&metadata';
import LandscapeMediumJpeg from '../assets/landscape.jpg?w=2000&tint=00aa00&metadata';
import LandscapeMediumWebp from '../assets/landscape.jpg?w=2000&webp&tint=00aa00&metadata';
import LandscapeLargeJpeg from '../assets/landscape.jpg?w=3000&tint=0000aa&metadata';
import LandscapeLargeWebp from '../assets/landscape.jpg?w=3000&webp&tint=0000aa&metadata';
import PortraitOriginal from '../assets/portrait.jpg?metadata';
import PortraitSmallJpeg from '../assets/portrait.jpg?w=1000&tint=aa0000&metadata';
import PortraitSmallWebp from '../assets/portrait.jpg?w=1000&webp&tint=aa0000&metadata';
import PortraitMediumJpeg from '../assets/portrait.jpg?w=2000&tint=00aa00&metadata';
import PortraitMediumWebp from '../assets/portrait.jpg?w=2000&webp&tint=00aa00&metadata';
import PortraitLargeJpeg from '../assets/portrait.jpg?w=3000&tint=0000aa&metadata';
import PortraitLargeWebp from '../assets/portrait.jpg?w=3000&webp&tint=0000aa&metadata';
import {
  DelayedReadyPicture,
  ErrorPicture,
  Image,
  LoadingPicture,
  useImageContext,
} from './Image';

export default {
  title: 'Components/Image',
  component: Image,
} as Meta<typeof Image>;

const Portrait = {
  original: PortraitOriginal,
  sizes: [
    PortraitSmallJpeg,
    PortraitMediumJpeg,
    PortraitLargeJpeg,
    PortraitSmallWebp,
    PortraitMediumWebp,
    PortraitLargeWebp,
  ],
};

const Landscape = {
  original: LandscapeOriginal,
  sizes: [
    LandscapeSmallJpeg,
    LandscapeMediumJpeg,
    LandscapeLargeJpeg,
    LandscapeSmallWebp,
    LandscapeMediumWebp,
    LandscapeLargeWebp,
  ],
};

const FluidContainer: Decorator = (story) => (
  <div className="w-96 border-2 border-dotted border-gray-400 p-4">
    {story()}
  </div>
);

const FixedContainer: Decorator = (story) => (
  <div className="h-32 w-96 border-2 border-dotted border-gray-400 p-4">
    {story()}
  </div>
);

const ConstrainedContainer: Decorator = (story) => (
  <div className="max-w-[1000px]">{story()}</div>
);

export const Fluid: StoryObj<typeof Image> = {
  decorators: [FluidContainer],
  args: {
    ...pick(Landscape.original, ['width', 'height', 'src']),
    alt: 'How did the goat et up there?!?',
  },
};

export const FixedCover: StoryObj<typeof Image> = {
  decorators: [FixedContainer],
  args: {
    ...Fluid.args,
    layout: 'cover',
  },
};

export const FixedContain: StoryObj<typeof Image> = {
  decorators: [FixedContainer],
  args: {
    ...Fluid.args,
    layout: 'contain',
  },
};

export const DefaultFallback: StoryObj<typeof Image> = {
  decorators: [FluidContainer],
  args: {
    ...Fluid.args,
    src: '/idontexist.jpg',
    alt: 'The goat is gone! Where is it?',
  },
};

export const FadeIn: StoryObj<typeof Image> = {
  decorators: [FluidContainer],
  args: {
    ...Fluid.args,
    className: 'transition-opacity duration-1000 opacity-0',
    readyClassName: 'opacity-100',
    Picture: DelayedReadyPicture,
  },
};

export const CustomPlaceholder: StoryFn = function Placeholder() {
  const { state } = useImageContext();
  if (state === 'loading') {
    return <p>🧘 Your image is being fetched.</p>;
  }
  if (state === 'error') {
    return <p>🤯 Your image could not be found.</p>;
  }
  return <></>;
};

export const CustomLoadingPlaceholder: StoryObj<typeof Image> = {
  decorators: [FluidContainer],
  args: {
    ...FadeIn.args,
    ...DefaultFallback.args,
    Picture: LoadingPicture,
    children: <CustomPlaceholder />,
  },
};

export const CustomErrorPlaceholder: StoryObj<typeof Image> = {
  decorators: [FluidContainer],
  args: {
    ...FadeIn.args,
    ...DefaultFallback.args,
    Picture: ErrorPicture,
    children: <CustomPlaceholder />,
  },
};

export const Responsive: StoryObj<typeof Image> = {
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    ...Fluid.args,
    srcSet: Landscape.sizes.map((size) => [size.src, size.width]),
  },
};

export const ResponsiveConstrained: StoryObj<typeof Image> = {
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [ConstrainedContainer],
  args: {
    ...Responsive.args,
    sizes: [['(min-width: 1000px)', '1000px']],
  },
};

export const ArtDirection: StoryObj<typeof Image> = {
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    ...Fluid.args,
    sources: [
      {
        media: '(orientation: portrait)',
        srcSet: [[Portrait.original.src, Portrait.original.width]],
      },
    ],
  },
};

export const ArtDirectionConstrained: StoryObj<typeof Image> = {
  decorators: [ConstrainedContainer],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    ...Fluid.args,
    sources: [
      {
        media: '(orientation: portrait)',
        srcSet: Portrait.sizes.map((size) => [size.src, size.width]),
      },
    ],
    srcSet: Landscape.sizes.map((size) => [size.src, size.width]),
    sizes: [['(min-width: 1000px)', '1000px']],
  },
};

export const LazyLoading: StoryFn = () => (
  <div>
    <Image
      {...pick(Landscape.original, ['src', 'width', 'height'])}
      alt="How did the goat get up there?!?"
      lazy={false}
    />
    <div className="h-[2000px]">Now some space ...</div>
    <Image
      {...pick(Portrait.original, ['src', 'width', 'height'])}
      alt="Big goater is watching you ..."
    />
    <Image
      {...pick(Landscape.sizes[0], ['src', 'width', 'height'])}
      alt="How did the goat get so red?!?"
    />
  </div>
);

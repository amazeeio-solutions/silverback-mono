import Image from 'gatsby-image';
import React from 'react';

export const BlockImage: React.FC<BlockImageFragment> = ({
  caption,
  image,
}) => (
  <div className="border-4 border-solid">
    {image?.localImage?.childImageSharp?.fixed && (
      <Image fixed={image.localImage.childImageSharp.fixed} />
    )}
    <div dangerouslySetInnerHTML={{ __html: caption }} />
  </div>
);

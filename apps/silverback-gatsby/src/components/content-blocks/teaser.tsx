import Image from 'gatsby-image';
import React from 'react';

export const BlockTeaser: React.FC<BlockTeaserFragment> = ({
  image,
  title,
  subtitle,
  url,
}) => (
  <div className="border-4 border-solid">
    <a href={url}>
      {image?.localImage?.childImageSharp?.fixed && (
        <Image fixed={image.localImage.childImageSharp.fixed} />
      )}
      <h2>{title}</h2>
      <h4>{subtitle}</h4>
    </a>
  </div>
);

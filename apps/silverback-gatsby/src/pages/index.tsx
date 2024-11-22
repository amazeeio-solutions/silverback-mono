import { graphql, Link, PageProps, useStaticQuery } from 'gatsby';
import React from 'react';
import { useIntl } from 'react-intl';

import {
  ImageSet,
  renderHtml,
} from '../../plugins/gatsby-plugin-images-from-html/render-html';
import { isDefined } from '../util/is-defined';
import { Row } from '../util/Row';

const IndexPage: React.FC<PageProps> = () => {
  const {
    allDrupalPage: { nodes: pages },
    allDrupalArticle: { nodes: articles },
    allDrupalGutenbergPage: { nodes: gutenbergPages },
    allDrupalWebform: { nodes: webforms },
  } = useStaticQuery<IndexPageQuery>(graphql`
    query IndexPage {
      allDrupalPage(filter: { title: { eq: "A page" } }) {
        nodes {
          id: _id
          translations: _translations {
            langcode: _langcode
            path
            title
            body
          }
          childrenImagesFromHtml {
            urlOriginal
            localImage {
              ...ImageSharpFixed
            }
          }
        }
      }
      allDrupalArticle(filter: { _defaultTranslation: { eq: true } }) {
        nodes {
          id: _id
          translations: _translations {
            langcode: _langcode
            path
            title
            tags {
              title
            }
          }
        }
      }
      allDrupalGutenbergPage(filter: { _defaultTranslation: { eq: true } }) {
        nodes {
          id: _id
          translations: _translations {
            langcode: _langcode
            path
            title
          }
        }
      }
      allDrupalWebform {
        nodes {
          path
          url
          title
        }
      }
    }
  `);
  const somePage = pages[0];

  const imageSets: ImageSet[] = [];
  for (const childImage of somePage?.childrenImagesFromHtml || []) {
    if (childImage?.localImage?.childImageSharp?.fixed) {
      imageSets.push({
        url: childImage.urlOriginal,
        props: {
          fixed: childImage.localImage.childImageSharp.fixed,
        },
      });
    }
  }

  const intl = useIntl();
  return (
    <>
      <b>A page. Just one Page node. Without a dedicated site page.</b>
      <table>
        <tr>
          <Row>
            {intl.formatMessage({
              defaultMessage: 'ID',
              id: 'qlcuNQ',
            })}
          </Row>
          <Row>
            {intl.formatMessage({
              defaultMessage: 'Title',
              id: 'mtG9Hr',
              description: 'table title',
            })}
          </Row>
          <Row>
            {intl.formatMessage({
              defaultMessage: 'Language',
              id: 'y1Z3or',
            })}
          </Row>
          <Row>
            {intl.formatMessage({
              defaultMessage: 'Path',
              id: 'Qp1beM',
            })}
          </Row>
          <Row>
            {intl.formatMessage({
              defaultMessage: 'Body',
              id: '1NdqJf',
            })}
          </Row>
        </tr>
        {somePage?.translations.map((page) => (
          <tr key={`page-row-${somePage.id}-${page.langcode}`}>
            <Row>{somePage.id}</Row>
            <Row>
              <Link to={page.path}>{page.title}</Link>
            </Row>
            <Row>{page.langcode}</Row>
            <Row>{page.path}</Row>
            <Row>
              <div className="html-from-drupal">
                {page.body && renderHtml(page.body, imageSets)}
              </div>
            </Row>
          </tr>
        ))}
      </table>
      <b>All articles. Linked to dedicated site pages.</b>
      <table>
        <tr>
          <Row>ID</Row>
          <Row>Title/Link</Row>
          <Row>Language</Row>
          <Row>Path</Row>
          <Row>Tags</Row>
        </tr>
        {articles.map((article) =>
          article.translations.map((translation) => (
            <tr key={`article-row-${article.id}-${translation.langcode}`}>
              <Row>{article.id}</Row>
              <Row>
                <Link to={translation.path}>{translation.title}</Link>
              </Row>
              <Row>{translation.langcode}</Row>
              <Row>{translation.path}</Row>
              <Row>
                {translation.tags
                  ?.filter(isDefined)
                  .map((tag) => tag.title)
                  .join(', ')}
              </Row>
            </tr>
          )),
        )}
      </table>
      <b>All Gutenberg pages. Linked to dedicated site pages.</b>
      <table>
        <tr>
          <Row>ID</Row>
          <Row>Title/Link</Row>
          <Row>Language</Row>
          <Row>Path</Row>
        </tr>
        {gutenbergPages.map((gutenbergPage) =>
          gutenbergPage.translations.map((translation) => (
            <tr
              key={`gutenberg-page-row-${gutenbergPage.id}-${translation.langcode}`}
            >
              <Row>{gutenbergPage.id}</Row>
              <Row>
                <Link to={translation.path}>{translation.title}</Link>
              </Row>
              <Row>{translation.langcode}</Row>
              <Row>{translation.path}</Row>
            </tr>
          )),
        )}
      </table>
      <b>All Webforms. Linked to dedicated site pages.</b>
      <table>
        <tr>
          <Row>Title/Link</Row>
        </tr>
        {webforms.map((webform) => (
          <tr key={`gutenberg-page-row-${webform.path}`}>
            <Row>
              <Link to={webform.path}>{webform.title}</Link>
            </Row>
          </tr>
        ))}
      </table>
    </>
  );
};

export default IndexPage;

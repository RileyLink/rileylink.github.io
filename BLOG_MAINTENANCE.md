# Blog maintenance

The public blog landing page is `blog/index.html` and displays the under-construction notice.

The original blog listing, including its search and category controls, is saved as `blog/index.draft.html`. The articles remain in `blog/posts/`, with their images in `blog/images/`. These paths are excluded from the GitHub Pages build in `_config.yml`, so direct links to the posts and images do not serve them on the website. They remain available in this public GitHub repository for editing.

To reopen the blog:

1. Edit the saved listing, posts, and images as needed.
2. Replace `blog/index.html` with the finished listing from `blog/index.draft.html`.
3. Remove `blog/posts` and `blog/images` from the `exclude` list in `_config.yml`. Keep the draft listing and this maintenance note excluded.
4. Update the homepage blog teaser and publish the changes.

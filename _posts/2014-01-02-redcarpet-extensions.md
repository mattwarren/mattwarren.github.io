---
layout: default
title: Configuring Redcarpet
---

# Configuring Redcarpet

GitHub uses the [Redcarpet](https://github.com/vmg/redcarpet/) renderer for `.md` content.

Jekyll supports various Markdown renderers and each has their own configuration settings. These settings are somewhat confusingly called "extensions".

The extensions for Redcarpet are documented in the "[simple to use](https://github.com/vmg/redcarpet#and-its-like-really-simple-to-use)" section of the main Redcarpet README.

Jekyll also adds a number of Jekyll specific Redcarpet extensions which are documented in the [Redcarpet section](http://jekyllrb.com/docs/configuration/#redcarpet) of the Jekyll configuration page.

In your `_config.yml` you can set the various extensions you want for a specific renderer, e.g. like so for Redcarpet:

```YAML
redcarpet:
    extensions: ["no_intra_emphasis", "tables", "autolink", "strikethrough", "with_toc_data"]
```

Let's look at all these Redcarpet extensions, both the standard ones and the Jekyll specific ones, and look at if they're used by GitHub for `.md` content.

## Standard Redcarpet extensions

### no_intra_emphasis

Set by GitHub - without it the `_` character within words would turn on emphasis so foo_bar would render as foo<i>bar</i>, i.e. without the underscore and with the "bar" part in italics.

### tables

Set by GitHub - without it the following would not be rendered as a table.

| Tables        | Are           | Cool  |
| ------------- |:-------------:| -----:|
| col 3 is      | right-aligned | $1600 |
| col 2 is      | centered      |   $12 |
| zebra stripes | are neat      |    $1 |

### fenced_code_blocks

Standard Markdown supports code blocks, with no special highlighting, that are created by indenting each line by four spaces.

With `fenced_code_blocks` code blocks can be fenced by three backticks with an optional language name from [languages.yml](https://github.com/github/linguist/blob/master/lib/linguist/languages.yml).

    ```javascript
    var s = "JavaScript syntax highlighting";
    alert(s);
    ```

```javascript
var s = "JavaScript syntax highlighting";
alert(s);
```

`fenced_code_blocks` is enabled by default by Jekyll and so doesn't need to be set explicitly for GitHub-like behavior.

### autolink

Set by GitHub - without it the following would not automatically be handled as links and you'd need to use `[foo@...](mailto:foo@...)` etc.

foo@bar.com  
www.example.com  
http://www.example.com/

### disable_indented_code_blocks

Not set by GitHub - if it were you couldn't use the traditional Markdown approach of creating code block by indenting them by four spaces.

    This is a code block created by indenting each line by four spaces.
    As in fenced code blocks you don't have to worry about e.g. <b> being interpreted.

### strikethrough

Set by GitHub - with this enabled you can strikethrough text with two `~` characters at the start and end.

~~strikethrough~~

### lax_spacing

Enabled by default by Jekyll and so doesn't need to be set explicitly for GitHub-like behavior.

In traditional Markdown any HTML has to be bounded by empty lines in order to be interpreted as HTML.

Without this the HTML creating the single cell table seen here would not be handled as HTML as it is surrounded by non-empty lines.

A non-empty line before the HTML.
<table>
    <tr>
        <td>Single cell HTML table</td>
    </tr>
</table>
A non-empty line after the HTML.

### space_after_headers

Enabled by default by Jekyll and so doesn't need to be set explicitly for GitHub-like behavior.

In traditional Markdown a `#` must be followed by a space to be interpreted as a header.

So `# some text` would be interpreted as a header but `#some text` would not. For GitHub both are fine.

##### With a space h5-header

#####Without a space h5-header

### superscript

Not set by GitHub. If it were the `^` character could be used to create superscripts like so `2^4` or `2^(nd)`.

### underline

Not set by GitHub. If it were you could underline words with `_` but as it is both `_` and `*` result in italics.

I.e. `_foobar_` and `*foobar*` both result in *foobar*.

### highlight

Not set by GitHub. If it were then ==highlighted== would appear as <mark>highlighted</mark>.

### quote

Not set by GitHub. If it were then "quote" would appear as <q>quote</q>. See also the more sophisticated `smart` extension below.

### footnotes

Not set by GitHub. If it were you could create footnotes like so:

    Here is some text containing a footnote.[^somesamplefootnote]

    [^somesamplefootnote]: Here is the text of the footnote itself.

### with_toc_data

Set by GitHub. Without this headers would not automatically have HTML anchors that can be linked to from elsewhere.

##### Link to me

To jump to this header you just need to do `[link](#link-to-me)` - which results in "[link](#link-to-me)".

See the separate "[Hover anchors](#hover-anchors)" section for more details.

### hard_wrap

Set by GitHub in some situations and not in others - see the separate "[Hard wrap](#hard-wrap)" section for more details.

### xhtml

Not set by GitHub. If it were XHTML-conformant tags would be output, e.g. `<br>` would be output as `<br/>`.

### prettify

Not set by GitHub. If it were the class `prettyprint` would be added to `code` tags so that you could use [google-code-prettify](https://code.google.com/p/google-code-prettify/wiki/GettingStarted). Note: this affects both inline code, i.e. text surrounded by backticks, and code blocks. If using this extension one should probably disable fenced code blocks which are handled with the [Pygments](http://pygments.org/) highlighting system.

### link_attributes

Not set by GitHub. It can be used to add attributes like `target="_blank"` or `rel="nofollow"` to all links. Note: the extensions sub-setting in `_config.yml` cannot be used for this extension as it only supports [extensions that can be set to true](http://jekyllrb.com/docs/configuration/#redcarpet).

## Safe HTML extensions

In addition to the extensions already covered there are a number of standard extensions related to constraining the use of HTML in Markdown.

GitHub is fairly lenient in this respect and the following restrictive extensions are _not_ set by GitHub:

* `filter_html`
* `no_images`
* `no_links`
* `escape_html`

The following two extensions, `no_styles` and `safe_links_only` are set by GitHub. However for your own pages it presumably doesn't make sense to restrict your own use of `<style>` tags or link types.

### no_styles

Set by GitHub. You cannot use the `<style>` tag to add extra CSS into Markdown content.

### safe_links_only

Set by GitHub. Only local links, anchors and the protocols `http`, `https`, `ftp` and `mailto` can be used in links (see [`sd_autolink_issafe`](https://github.com/vmg/redcarpet/blob/4b8df5a/ext/redcarpet/autolink.c#L34) in `anchor.c`).

## Jekyll specific Redcarpet extensions

### no_fenced_code_blocks

Not set by GitHub. This allows you to disable Jekyll's default behavior of enabling fenced code blocks.

### smart

Not set by GitHub. If it were "foobar" and ``foobar'' would both appear as &ldquo;foobar&rdquo; and 'foobar' would appear as &lsquo;foobar&rsquo;.

Similarly three periods would appear as a proper elipsis character, two minuses as an en-dash and three as an em-dash.

See [SmartyPants](http://daringfireball.net/projects/smartypants/) for more details.

## Notes

### Language specific highlighting

```javascript
var s = "JavaScript syntax highlighting";
alert(s);
```

By default Jekyll uses the [Pygments](http://pygments.org/) highlighting system for code blocks like the above.

If you look at the HTML generated by Jekyll for the above code block you see:

```html
<div class="highlight">
    <pre>
        <code class="language-javascript" data-lang="javascript">
            <span class="kd">var</span>
            ...
```

However if you look at what GitHub generates you see:

```html
<div class="highlight highlight-javascript">
    <pre>
        <span class="pl-s">var</span>
```

The `<span>` classes seen in the GitHub generated output are the ones supported by [github-markdown-css](https://github.com/sindresorhus/github-markdown-css).

For the ones seen in the Pygments output from Jekyll you have to generate a `.css` file like so:

```bash
$ pygmentize -S default -f html > css/syntax.css
```

And then include it in your `_layout` file. This results in highlighting that is somewhat different to that seen in GitHub.

Note: the difference between the standard Jekyll behavior and that seen in GitHub is definitely not the result of the use or not of `highlighter` or `prettify` in `_config.yml`.

### Hard wrap

The GitHub help page "[Writing on GitHub](https://help.github.com/articles/writing-on-github/#newlines)" states that GitHub uses the behavior enabled by `hard_wrap`.

    Roses are red
    Violets are blue

With `hard_wrap` the above becomes:

Roses are red<br>
Violets are blue

I.e. newlines within a paragraph end up as `<br>` tags - in traditional Markdown two newlines result in a new paragraph, i.e. `<p>`, while single newlines are ignored.

However GitHub seems a bit schizophrenic about the use of `hard_wrap` - it is enabled for issues, comments and pull request descriptions but not for wiki pages or when viewing `.md` file.

In a wiki page or `.md` file the above appears as:

Roses are red Violets are blue

I.e. the lines run together. If you do want a newline you have to end a line with two spaces - this will result in a `<br>`.

If you don't like that spaces at the end of a line aren't obvious in most editors you can also explicitly use `<br>`.

If you do enable `hard_wrap` it will introduce `<br>` tags even in HTML that you embed in your Markdown, e.g.:

```html
<table>
    <tr>
        <td>Single cell HTML table</td>
    </tr>
</table>
```

If `hard_wrap` is enabled this will result in the following being generated:

```html
<table><br>
    <tr><br>
        <td>Single cell HTML table</td><br>
    </tr><br>
</table><br>
```

Which probably isn't what you'd expect or want. The only way to get around this is avoid newlines in your HTML:

```html
<table><tr><td>Single cell HTML table</td></tr></table>
```

### Hover anchors

The `with_toc_data` extension just causes `id` attributes to be added to headers. To also get an anchor to appear when you hover over the header, as happens with GitHub, it was necessary to:

* create an `_includes` subdirectory and copy in [`anchor_links.html`](https://github.com/jekyll/jekyll/blob/master/site/_includes/anchor_links.html) from the GitHub Jekyll project.
* include this file before the `</body>` tag of `_layouts/default.html` using the Liquid markup `{% raw %}{% include anchor_links.html %}{% endraw %}`.

The Jekyll project uses `anchor_links.html` like this to add hover anchors for their own site but with a somewhat different look to GitHub (a different font for the anchors and the anchors appear to the right of headers).

To get the GitHub style of hover anchors it was necessary to slightly modify `anchor_links.html`.

```html
<h2 id="my-header">My Header</h2>
```

With this change the above is now processed to appear as:

```html
<h2 id="my-header"><a class="anchor" href="#my-header"><span class="octicon octicon-link"></span></a>My Header</h2>
```

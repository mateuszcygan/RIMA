import wikipediaapi

def getRelatedArticles(keyword='python', num_articles=3):

    wiki_wiki = wikipediaapi.Wikipedia('en')

    page = wiki_wiki.page(keyword)
    if not page.exists():
        return []

    related_articles = []
    links = page.links
    for title in links.keys():
        if len(related_articles) >= num_articles:
            break
        article = wiki_wiki.page(title)
        if article.exists():
            article_data = {
                'title': article.title,
                'link': f"https://en.wikipedia.org/wiki/{article.title.replace(' ', '_')}"
            }
            related_articles.append(article_data)
            print(related_articles)

    return related_articles
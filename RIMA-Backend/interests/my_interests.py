from .wikipedia_utils import wikicategory
import wikipediaapi
import requests
import json
import random
import nltk
from collections import Counter
from .semantic_scholar import SemanticScholarAPI
import time

def getPagesInCategory(cat):
    wiki= wikipediaapi.Wikipedia("en")
    allPagesCat=wiki.page("Category:"+cat)
    allPagesCat=allPagesCat.categorymembers
    allPages=[]
    subCat=[]
    for i in allPagesCat:
        catOrPage=i.split(":")
        if len(catOrPage) !=1:
            subCat.append(catOrPage)
        else:
            allPages.append(catOrPage[0])
    return(allPages)


def getRandPages(pages, n):
    pages=list(set(pages))
    currPages=[]
    try:
        for i in range(0,n):
            page=random.choice(pages)
            currPages.append(page)
            pages.pop(pages.index(page))
    except:

        print("no categories\n\n\n")

    return currPages

def getPageData(interest):
    wiki = wikipediaapi.Wikipedia('en')
    page=wiki.page(interest)
    try:
        summary=page.summary
        url=page.fullurl
        title=page.title
        pageData={
            "title":title,
            "summary":summary,
            "url":url,
            "interest":interest
        }

    except:
        pageData={
            "title":interest,
            "summary":"",
            "url":"",
            "interest":""
        }

        print(interest, page)
    return pageData

def getDataDiscoverInterest(interest):
    categories=wikicategory(interest)
    data=[]
    print(categories, "..........................\n\n\n")

    for c in categories:
        listPageData=[]
        allPages=getPagesInCategory(c)
        pages=getRandPages(allPages,3)
        for page in pages:
            pageData=getPageData(page)
            listPageData.append(pageData)
        dataCat = {
            "topic":c,
            "color": "#397367",
            "allPages":allPages,
            "relatedTopics":listPageData
        }
        data.append(dataCat)
    return data

def getDataDiscover(interests):
    data={}
    for i in interests:
        data[i]=getDataDiscoverInterest(i.capitalize())
        time.sleep(1)
    return data





#start functions for explore.py
def getLinksTextInPage(interest):
    wiki=wikipediaapi.Wikipedia('en')
    page=wiki.page(interest)

    links=page.links
    text=page.text


    return links, text

def getCountLinks(links, text, topN=3):
    linksWithNum=[]
    for link in links.keys():
        count = text.count(link)
        linksWithNum.append((link,count))
    linksWithNum.sort(key=lambda tup:tup[1], reverse=True)
    return linksWithNum[:topN]

def getDataNewInterestExplore(interest):
    print(interest, "test test")
    links, text = getLinksTextInPage(interest.capitalize())
    top3Interests=getCountLinks(links, text)

    relatedTopics=[]
    for i in top3Interests:
        currLinks, currText=getLinksTextInPage(i[0])
        currTop3Interests=getCountLinks(currLinks, currText)
        currRelatedTopics=[]


        for j in currTop3Interests:
            currPage2=getPageData(j[0])
            currRelatedTopics.append(currPage2)


        currPage=getPageData(i[0])

        currPage["relatedTopics"]=currRelatedTopics
        relatedTopics.append(currPage)

    data=getPageData(interest)
    data["relatedTopics"]=relatedTopics


    return data

def getDataExplore(interests):
    data=[]
    for i in interests:
        print("\n\n\n",i, "new interests")
        currData=getDataNewInterestExplore(i)
        time.sleep(1)
        data.append(currData)
        print(data, "data interest")
    return data

#start functions connect

def getRefCitAuthorsPapers(authorId, method):
    results={"listAllAuthors":[]}
    dictAuthorsNames={}

    api=SemanticScholarAPI()
    if method in ["citations", "references"]:
        data=api.citations_references(id=authorId, method=method)
    else:
        print("expected method to be either citations or references")


    for paper in data:
        for m in paper[method]:
            if len(m["authors"]) != 0:
                if authorId not in m["authors"]:
                    for author in m["authors"]:
                        if author["authorId"]!=None:
                            if author["authorId"]!=authorId:
                                listAuthors=results["listAllAuthors"]
                                listAuthors.append(author["authorId"])
                                results["listAllAuthors"]=listAuthors
                                if author["authorId"] in results:
                                    papers=[]
                                    papers=results[author["authorId"]]
                                    papers.append(m["paperId"])

                                    results[author["authorId"]]=papers
                                else:
                                    results[author["authorId"]]=[m["paperId"]]
                                    dictAuthorsNames[author["authorId"]]=[author["name"]]





    results["authorsNames"]=dictAuthorsNames

    return results

def getMostCitedReferenced(authorId, method, n=3):

    allCitsRefs=getRefCitAuthorsPapers(authorId=authorId, method=method)
    listAuthors=allCitsRefs["listAllAuthors"]
    dictAuthorsName=allCitsRefs["authorsNames"]
    topN=list(Counter(listAuthors).most_common(n))
    api=SemanticScholarAPI()

    allAuthors=[]
    dictPapers={}

    for i in topN:
        author = i[0]
        papersAuthor=allCitsRefs[author]
        allPapers=[]
        for j in set(papersAuthor):
            if j in dictPapers:
                allPapers.append(dictPapers[j])
            else:
                if j != None:
                    paper=api.paper(j)
                    authors=""
                    for a in paper["authors"]:
                        authors=a["name"]+","+authors
                    if paper["abstract"] == None:
                        abstract="No abstract available"
                    else:
                        abstract=paper["abstract"]
                    paperData={
                        "id":1,
                        "paper_id":j,
                        "authors":authors,
                        "url":paper["url"],
                        "title":paper["title"],
                        "abstract":abstract,
                        #"abstract":"abstract",
                        "year":paper["year"],
                        "updated_on":"2022",
                        "created_on":"2022"
                    }
                    allPapers.append(paperData)
                    dictPapers[j]=paperData
        interests=getInterests(j)
        authorData={
            "name":dictAuthorsName[author][0],
            "paper":allPapers,
            "interests":interests,
            "score":len(allPapers),

        }

        allAuthors.append(authorData)

    return allAuthors

def getInterests(authorId):
    interests=["user modeling", "educational technology","lifelong learning","human-centered design",
               "keyword extraction", "test","self-actualization",
               "technology acceptance model","massive open online course" ]
    k=random.choice(range(8,15))

    return random.choices(interests, k=k)

def getConnectData(id):
    authorId=id["data"]
    print("get most authors who cited me the most")
    authorsCitedMe= getMostCitedReferenced(authorId=authorId, method="citations")
    print("get authors Who I cited the most")
    authorsReferences=getMostCitedReferenced(authorId=authorId, method="references")
    data={"citations":authorsCitedMe, "references":authorsReferences}
    return data

def getWikiInfo(interestsData):
    #print(interest, "get wiki info")
    interests=interestsData["interest"]
    #data={}
    #for i in interests:
    #    pageData=getPageData(i)
    #  data[i]=pageData
    pageData=getPageData(interests)


    #answer={"test":"test", "page":page, "dataInterst":dataInterest, "data":data}

    return pageData






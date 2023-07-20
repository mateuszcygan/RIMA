import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import React, {useEffect, useState, useRef} from "react"
//import './cytoscape.css';

import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, TextField, Button, DialogActions, SvgIcon } from '@material-ui/core';
import { OpenInNew } from '@material-ui/icons';
//import data from "./data";
import cxtmenu from "cytoscape-cxtmenu";
import WikiDesc from "../Connect/WikiDesc";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RestAPI from "../../../../../Services/api";
import WikipediaLogo from "./Wikipedia-logo.png"

cytoscape.use(cxtmenu);

let colorPalette = [
  "#397367",
  "#160C28",
  "#EFCB68",
  "#C89FA3",
  "#368F8B",
  "#232E21",
  "#B6CB9E",
  "#92B4A7",
  "#8C8A93",
  "#8C2155",
  "#22577A",
  "#7FD8BE",
  "#875C74",
  "#9E7682",
  "#FCAB64",
  "#EDCB96",
  "#231942",
  "#98B9F2"
];

function getColor(currColors, colors) {

  const allColors = colors;
  let pickedColor = "";
  if (allColors.length === currColors.length) {
    currColors = [];
    pickedColor = allColors[0];
  } else {
    let index = currColors.length;
    pickedColor = allColors[index];
    currColors.push(pickedColor);
  }

  return [pickedColor, currColors];
}

function getElements(data) {
  let ids = [...Array(200).keys()];
  let elements = [
    {data: {id: -1, label: "My Interests", level: 0, color: "black"}}
  ];
  
  let currColors = [];
  let uniqueTitles = [];

  try {
    data.map((d) => {
      let colors = getColor(currColors, colorPalette);
      currColors = colors[1];
      let label = d.title;

      // Check if the interest title is already added
      if (!uniqueTitles.includes(label)) {
        uniqueTitles.push(label);
        let explore = d.relatedTopics;
        let idLevel1 = ids.pop();
        let color = colors[0];
        let element = {
          data: {
            id: idLevel1,
            label: label,
            level: 1,
            color: color,
            pageData: d.summary,
            url: d.url
          },
          classes: ["level1"]
        };
        let edge = {
          data: { source: -1, target: idLevel1, color: color },
          classes: ["level1"]
        };
        elements.push(element, edge);

      explore.map((e) => {
        label = e.title;
        //idLevel2=idTarget+1
        // Check if the related topic title is already added
        if (!uniqueTitles.includes(label)) {
          uniqueTitles.push(label);
          let idLevel2 = ids.pop();
          element = {
            data: {
              id: idLevel2,
              label: label,
              level: 2,
              color: color,
              pageData: e.summary,
              url: e.wikiURL
            },
            classes: ["level2"]
          };
          edge = {
            data: { target: idLevel2, source: idLevel1, color: color },
            classes: ["level2"]
          };

          elements.push(element, edge);

        let relatedTopics = e.relatedTopics;

        relatedTopics.map((r) => {
          let idLevel3 = ids.pop();
          label = r.title;

        // Check if the related topic title is already added
        if (!uniqueTitles.includes(label)) {
          uniqueTitles.push(label);
          element = {
            data: {
              id: idLevel3,
              label: label,
              level: 3,
              color: color,
              pageData: r.summary,
              url: r.wikiURL
            },
            classes: ["collapsed", "level3"]
          };
          edge = {
            data: { target: idLevel3, source: idLevel2, color: color },
            classes: ["collapsed", "level3"]
          };
          elements.push(element, edge);

          let currRelatedTopics = r.currRelatedTopics;

          currRelatedTopics.map((c) => {
            let idLevel4 = ids.pop();
            label = c.title;
            element = {
              data: {
                id: idLevel4,
                label: label,
                level: 4,
                color: color,
                pageData: c.summary,
                url: c.wikiURL
              },
              classes: ["collapsed1", "level4"]
            };
            edge = {
              data: {target: idLevel4, source: idLevel3, color: color},
              classes: ["collapsed1", "level4"]
            }; 
            elements.push(element, edge);
          });
        }});
      }});
    }})
  } catch{
    elements = [
      {data: {id: -1, label: "Sorry, an error occurred.", level: 0, color: "red"}}
    ];
  };

  return [elements, currColors];
  
}

const NodeLink = (props) => {
  const {data, keywords, setKeywords, colors} = props;
  const [elements, setElements] = useState([]);
  const [openDialog, setOpenDialog] = useState({
    openLearn: null,
    openAdd: null,
  });
  const [deleteOpen, setDeleteOpen] = useState({
    openDelete: null,
    nodeObj: null
  });
 

  const handleOpenLearn = (ele) => {
    const data = ele.data(); //parameter that is passed to deleteInterests function
    setOpenDialog({...openDialog, openLearn: true, nodeObj: data});
  };
  const handleCloseLearn = () => {
    setOpenDialog({...openDialog, openLearn: false});
  };

  const validateInterest = (interests, interest) => {
    return interests.some((i) => i.text === interest.toLowerCase());
  };

  const handleOpenDelete = (ele) => {
    const data = ele.data()
    setDeleteOpen({...deleteOpen, openDelete: true, nodeObj: data});
  };

  const handleCloseDelete = () => {
    setDeleteOpen({...deleteOpen, openDelete: false});
  };

  //Mateusz: function needed for finding a node in a cytoscape graph by a certain id
/*   function findNode(cy, propertyValue) {
    const nodes = cy.nodes().filter((node) => node.data(propertyName) === propertyValue);
    return nodes.length > 0 ? nodes[0] : null;
  } */

  //Mateusz: create a ref to store the cytoscape instance (needed at deleting related interests when a certain interest is deleted)
  const cyRef = useRef(null);

  //Mateusz: function to get the cytoscape instance
  const getCytoscapeInstance = () => {
    return cyRef.current;
  };

  //Mateusz: function to find a node within CytoscapeComponent with a specific id
  const findNode = (cy, nodeId) => {
    const ele = cy.nodes().filter((node) => node._private.data.id === nodeId);
    return ele.data();
    /* console.log(`data.() of element with ${nodeId}: `, ele.data()); */
  };

  const deleteInterest = async (element) => {
    const cy = getCytoscapeInstance();
    //console.log("cytoscape instance", cy);

    //console.log("Element in deleteInterests function as a parameter: ", element);
    //console.log("all elements: ", elements);

    let elementId = element.id;
    let elementTitle = element.label;
  
    console.log("element to delete (id, title):", elementId, elementTitle);
    findNode(cy, elementId);

    // Find the index of the element in the elements array
    const elementIndex = elements.findIndex(
      (element) => element.data.id === elementId
    );
    //console.log("index of an element that should be deleted: ", elementIndex)
  
    if (elementIndex !== -1) {
      // Remove the element, nodes, and edges from the elements array
      const elementToRemove = elements[elementIndex];
      elements.splice(elementIndex, 1);

      //edge that connects an interest with the rest of the diagram (edge to be deleted is 'target' there)
      const elementEdge = elements.filter(
        (element) => element.data.target === elementId
      );

      console.log("element edge that connects deleted interest to the diagram:", elementEdge);

      elementEdge.forEach((edge) => {
        const elementEdgeIndex = elements.findIndex(
          (element) => element === edge
        );
        elements.splice(elementEdgeIndex, 1);
      })

      console.log("elementId of current interest: ", elementId);
      //edges that start at interest to be deleted (source) and target at further interests
      const connectedEdges = elements.filter(
        (element) => element.data.source === elementId
      );

      console.log("edges that go out of deleted interest: ", connectedEdges);

      connectedEdges.forEach((edge) => {
        const edgeIndex = elements.findIndex(
          (element) => element === edge
        );
        elements.splice(edgeIndex, 1);
      });

      if (elementId > -1 && elementId > 251) {
        //take targets of the interest that is deleted (nodes) - relatedInterests (they have a certain id), add them to an array in order to delete them as well later
        const relatedInterests = [];
        connectedEdges.forEach((edge) => {
          //console.log("edge target: ", edge.data.target);
          const relatedInterest = elements.filter(
            (element) => element.data.id === edge.data.target
          );
          relatedInterests.push(relatedInterest);
        });

        const flattenedRelatedInterests = relatedInterests.flat();

        if (relatedInterests.length !== 0) {
          flattenedRelatedInterests.forEach((relatedInterest) => {
            const relatedInterestToDelete = findNode(cy, relatedInterest.data.id);
            //console.log("passed to deleteInterest: ", relatedInterestToDelete);
            deleteInterest(relatedInterestToDelete);
            /* console.log("related interests from flattened list: ", relatedInterest); */
            /* deleteInterest(relatedInterest); */ //here should be an element of form ele.data() passed so that the function works correctly
          });
        }
      }

      //if the array of relatedIntersts is not empty, delete relatedInterests with their corresponding interests and nodes
      /* if (relatedInterests.length !== 0) {
        (relatedInterests.flat()).forEach((relatedInterest) => {
          console.log("related interest that should be deleted: ", relatedInterest);
          deleteInterest(relatedInterest);
        });
      } */

      /* console.log(elements);

      //besser auskommentiere""n für bessere Performanz
      const connectedNodes = elements.filter(
        (element) => element.data.source == elementToRemove.data.id
      );

      console.log("connected nodes: ", connectedNodes);
      
      //great idea to call the function recursivly, but we don't have nodes that are connected to the origin node
      connectedNodes.forEach((node) => {
        deleteInterest(node.data.id);
      }); */

      // Mateusz: case of delete function for manual added nodes
      if (elementId < -1 && elementId < 251) {

        const connectedNodes = elements.filter(
          (element) => element.data.target == elementId
        );
        console.log("connected nodes for manuals:", connectedNodes);

        connectedNodes.forEach((node) => {
          const nodeIndex = elements.findIndex(
            (element) => element == node
          );
          elements.splice(nodeIndex, 1);
        }); 

        const relatedNodesAndEdges = relatedArticles.filter(
          (relatedArticle) => relatedArticle.data.target == elementId
        );

        console.log("Related articles to node ", elementId, relatedNodesAndEdges);

        relatedNodesAndEdges.forEach((element) => {
          const elementIndex = relatedArticles.findIndex(
            (element) => element.data.target == elementId
          );
          relatedArticles.splice(elementIndex, 1);
        });
      }

      //console.log("relatedArticles after removing: ", relatedArticles);

      try {
        const msg = `The interest "${element.label}" has been deleted.`;
        toast.success(msg, {
          toastId: "addLevel2",
          autoClose: 3000 // Display for 3 seconds
      });
      } catch (err) {
        console.log("Error adding interest:", err);
        toast.error("Failed to remove the interest. Please try again later.", {
          toastId: "addLevel2",
          autoClose: 3000 // Display for 3 seconds
        });
      }
    }
    else {
      toast.error("Failed to remove the interest. Please try again later.", {
        toastId: "addLevel2",
        autoClose: 3000 // Display for 3 seconds
      });
    }
    //console.log("Elements after removing", elements);
  };
  
  //ADD FUNKTION WURDE geändert, die alte ist unten
  const addNewInterest = async (currInterest) => {
    const alreadyExist = keywords.some((interest) => interest.text === currInterest.toLowerCase());
  
    if (alreadyExist) {
      console.log("Interest already exists in my list!");
      return;
    }
  
    const newInterest = {
      id: Date.now(),
      categories: [],
      originalKeywords: [],
      source: "Manual",
      text: currInterest.toLowerCase(),
      value: 3,
    };
  
    const newKeywords = [...keywords, newInterest];
  
    try {
      await RestAPI.addKeyword(newKeywords);
      newKeywords(newKeywords);
  
      const msg = `The interest "${currInterest}" has been added to your interests.`;
      toast.success(msg, {
        toastId: "addLevel2"
      });
    } catch (error) {
      console.error("Error adding interest:", error);
      toast.error("Failed to add the interest. Please try again later.", {
        toastId: "addLevel2"
      });
    }
  };
  
  /*const addNewInterest = async (currInterest) => {
    let alreadyExist = validateInterest(keywords, currInterest);

     if (!alreadyExist) {
         let newInterests = keywords;
         let newInterest = {
             id: Date.now(),
             categories: [],
             originalKeywords: [],
             source: "Manual",
             text: currInterest.toLowerCase(),
             value: 3,
         }
         newInterests.push(newInterest);

         newInterests.sort((a, b) => (a.value < b.value) ? 1 : ((b.value < a.value) ? -1 : 0));
         let listOfInterests = [];
         newInterests.forEach(interest => {
             let item = {
                 name: interest.text,
                 weight: interest.value,
                 id: interest.id,
                 source:interest.source
             }
             listOfInterests.push(item);
         });
         console.log("Updated list", listOfInterests)
         try {
             await RestAPI.addKeyword(listOfInterests);
         } catch (err) {
             console.log(err);
         }
         // console.log(newInterests)
     }
     console.log("Interest already exists in my list!")
  }*/

  //const [state, setState]=useState(getElements(data))

  //Mateusz: when NodeLink.colors are changed (check box in color button), then graph should be rendered with new colors
  useEffect(() => {
    colorPalette = NodeLink.colors;
    const elementsCurr = getElements(data);
    //console.log(elementsCurr);

    setElements([]);
    setElements(elementsCurr[0]);
  }, [data, NodeLink.colors]);

  //const elements = getElements(data);

  const layoutGraph = {
    name: "concentric",
    concentric: function (node) {
      return 10 - node.data("level");
    },
    levelWidth: function () {
      return 1;
    }
  };
  const stylesheet = [
    {
      selector: "node",
      style: {
        width: 200,
        height: 200,
        label: "data(label)",
        "background-color": "data(color)",
        color: "white"
      }
    },
    {
      selector: "edge",
      style: {
        "curve-style": "straight"
      }
    },
    {
      selector: "node[label]",
      style: {
        "text-halign": "center",
        "text-valign": "center",
        "text-wrap": "wrap",
        "text-max-width": 20,
        "font-size": 24
      }
    },
    {
      selector: ".collapsed",
      style: {
        display: "none"
      }
    },
    {
      selector: ".collapsed1",
      style: {
        display: "none"
      }
    },
    {
      selector: ".level1",
      style: {
        "line-color": "data(color)",
        color: "white"
      }
    },
    {
      selector: ".level2",
      style: {
        "background-opacity": 0.6,
        "line-color": "data(color)"
      }
    },
    {
      selector: ".level3",
      style: {
        "background-opacity": 0.4,
        "line-color": "data(color)"
      }
    },
    {
      selector: ".level4",
      style: {
        "background-opacity": 0.3,
        "line-color": "data(color)",
      }
    }   
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [articles, setArticles] = useState([]);
  //const [selectedArticles, setSelectedArticles] = useState([]);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [isExpandDialogOpen, setExpandDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  const handleExpandClick = (ele) => {
    setSelectedNode(ele);
    setExpandDialogOpen(true);
  };

  const handleExpandDialogClose = () => {
    setExpandDialogOpen(false);
    setSelectedNode(null);
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleKeywordChange = (event) => {
    setKeyword(event.target.value);
  };

  const handleSearchArticles = () => {
    if (keyword.trim() === '') {
      toast.error('Your input field is empty', {
        toastId: 'emptyInput',
        containerId: 'toastContainer',
        className: 'custom-toast-error',
        autoClose: 3000, // 3 seconds
      });
      return; // Stop further execution
    } else {
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${keyword}&srlimit=3&callback=handleResponse`;

      const script = document.createElement('script');
      script.src = url;
      document.head.appendChild(script);
    }
  };

  // Mateusz: function to open the Wikipedia page in a new tab ("Read more" option in manual added nodes)
  const handlePreviewArticle = (event, article) => {
    event.stopPropagation();
    window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`, '_blank');
  };

  window.handleResponse = (data) => {
    const fetchedArticles = data.query.search.map((article) => ({
      title: article.title,
      link: `https://en.wikipedia.org/wiki/${article.title.replaceAll(' ', '_')}`,
    }));
    setArticles(fetchedArticles);
  };

  const handleSelectArticle = (article) => {

    const isDuplicate = elements.some(
      (element) => element.data.label === article.title 
    );
    console.log("isDuplicate", isDuplicate);
  
    if (isDuplicate) {
      const message = "You have already added " + article.title + " to your interests";
      toast.error(message, {
        toastId: "duplicateInterest",
        containerId: "toastContainer",
        className: "custom-toast-error",
      });
      return;
    } else {
      /* const newSelectedArticles = [...selectedArticles, article];
      setSelectedArticles(newSelectedArticles);
      console.log("selected articles: ", selectedArticles); */
  
      //Mateusz: id for manual added nodes is determined by the length of related articles
      // after removing manual added node, related articles are also removed
      const newNodeId = -2 - (relatedArticles.length/6); 
      
      const newNode = {
        data: {
          id: newNodeId,
          label: article.title,
          level: 1,
          color: "#808080",
          pageData: "",
          url: article.link,
        },
        classes: ["level1"],
        style: {
          width: 155,
          height: 155,
          shape: "roundrectangle",
          opacity: "0.8",
        },
      };

      const newEdge = {
        data: {
          source: -1,
          target: newNodeId,
          color: "#808080",
        },
        classes: ["level1"],
      };

      elements.push(newNode, newEdge);

      // Fetch related articles
      const relatedUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links&pllimit=3&titles=${article.title}&callback=handleRelatedResponse`;

      const script = document.createElement('script');
      script.src = relatedUrl;
      document.head.appendChild(script);
      
    }
  };

  /* const sortLinks = (links) => {
    // Count the occurrences of each link
    const occurrenceCounts = links.reduce((counts, link) => {
      counts[link.title] = (counts[link.title] || 0) + 1;
      return counts;
    }, {});
  
    // Sort the links based on occurrence count in descending order
    const sortedLinks = links.sort((a, b) => occurrenceCounts[b.title] - occurrenceCounts[a.title]);
  
    return sortedLinks;
  }; */

  /* useEffect(() => { */
    window.handleRelatedResponse = (data) => {
      const pageId = Object.keys(data.query.pages)[0];
      const currentLength = relatedArticles.length;

      const links = data.query.pages[pageId].links;
      //console.log("All links", links);

      // Filter and sort the links based on occurrence count
      /* const sortedLinks = sortLinks(links); */

      // Get the top 3 links
      /* const topThreeLinks = sortedLinks.slice(0, 3); */
      //console.log("These are the top three links", topThreeLinks);
      
      // Process the top 3 links
      //need renaming targetId, sourceid, data.target => data.source
      const newRelatedArticles = links.map((link, index) => {
        const sourceId = -2 - (currentLength / 6);
        const targetId = 250 + index + currentLength;
        const newNode = {
          data: {
            id: targetId,
            target: sourceId,
            label: link.title,
            level: 2,
            color: "#808080",
            pageData: "",
            url: `https://en.wikipedia.org/wiki/${link.title.replaceAll(" ", "_")}`,
          },
          classes: ["level2", "collapsed"],
          style: {
            width: 155,
            height: 155,
            shape: "roundrectangle",
            opacity: "0.8",
          },
        };

        const newEdge = {
          data: {
            /* source: sourceId,
            target: targetId, */
            source: sourceId,
            target: targetId,
            color: "#808080",
          },
          classes: ["level2"],
        };
        elements.push(newNode, newEdge); // Add newNode and newEdge to the elements array

        return [newNode, newEdge]; // Return an array of node and edge objects
      });

      setRelatedArticles((prevArticles) => [...prevArticles, ...newRelatedArticles.flat()]);
      /* elements.push(...relatedArticles); */

      //console.log("related articles", relatedArticles);
    };
  /* }, [relatedArticles]); */

  // Mateusz: workaround so that the diagram with manual added nodes are rendered in the graph (pop-up window needed)
  useEffect(() => {
    let timeoutId;
    if (isExpandDialogOpen) {
      timeoutId = setTimeout(() => {
        handleExpandDialogClose();
      }, 0.001); // Set the timeout duration in milliseconds (3 seconds in this case)
    }
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isExpandDialogOpen]);

  return (
    <>
      <CytoscapeComponent
        style={{width: "100%", height: "800px", backgroundColor: "#F8F4F2", fontSize: 11.3}} //creating space for nodes (rectangle)
        layout={layoutGraph}
        stylesheet={stylesheet}
        elements={elements}
        cy={(cy) => {
          //Mateusz: store the cytoscape instance in the ref (needed for deleting function)
          cyRef.current = cy;

          cy.elements().remove();
          cy.add(elements);
          cy.layout(layoutGraph);
          cy.layout(layoutGraph).run();

          //Pia: after hovering over nodes, the default cursor changes to pointer (hand icon)
          cy.fit();
          cy.on('mouseover','node', (event) => {  
            if(event.cy.container('node')) {
              event.cy.container('node').style.cursor = 'pointer';
            }
          })
          cy.on('mouseout','node', (event) => {
            if(event.cy.container('node')) {
              event.cy.container('node').style.cursor = 'default';
            }
          })

          let defaultsLevel0 = {
            selector: "node[level=0]",
            menuRadius: 75,
            commands: [
              {
                content: "Add own interest",
                contentStyle: {},
                select: function (ele) {
                  handleOpenModal();
                  //console.log(articles);
                },
                enabled: true,
              },
            ],
            fillColor: "black", // the background colour of the menu
            activeFillColor: "grey", // the colour used to indicate the selected command
            activePadding: 8, // additional size in pixels for the active command
            indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
            separatorWidth: 3, // the empty spacing in pixels between successive commands
            spotlightPadding: 8, // extra spacing in pixels between the element and the spotlight
            adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
            //minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            //maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            openMenuEvents: "tap", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
            itemColor: "white", // the colour of text in the command's content
            itemTextShadowColor: "transparent", // the text shadow colour of the command's content
            zIndex: 9999, // the z-index of the ui div
            atMouse: false, // draw menu at mouse position
            outsideMenuCancel: 8 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel2 = {
            selector: "node[level=2]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: function (ele) { // an array of commands to list in the menu or a function that returns the array
              const id = ele.data("id");

              if (id < 250) {
                return [
                  {
                    content: "Learn more",
                    // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      // a function to execute when the command is selected

                      handleOpenLearn(ele); // `ele` holds the reference to the active element
                    },
                    enabled: true // whether the command is selectable
                  },
                  {
                    content: "Expand",
                    contentStyle: {},
                    select: function (ele) {
                      let succ = ele.successors().targets();
                      let edges = ele.successors();
    
                      edges.style("opacity", 0)
                      .style("background-color", "background-color")
                      .animate({
                        style: { opacity: 1 },
                        duration: 750,
                        easing: "ease-in-sine",
                        queue: false,
                        complete: function () {
                          edges.style("background-color", ele.css("background-color"));
                        }
                      });
                
                      succ.style("opacity", 0)
                        .style("background-color", "background-color")
                        .style("width", 0)
                        .style("height", 0)
                        .animate({
                          style: { opacity: 1, width: 200, height: 200 },
                          duration: 750, // Adjust the duration value to control the speed (in milliseconds)
                          easing: "ease-in-sine",
                          queue: false,
                          complete: function () {
                            succ.style("background-color", ele.css("background-color"));
                          }
                        });
    
                        
                  
                    let ids = [];
                    edges.map((e) => {
                      e.removeClass("collapsed");
                      ids.push(
                        e.data()["target"],
                        e.data()["source"],
                        e.data()["id"]
                      );
                      console.log(ids, "test");
                    });
    
                    /*succ.map((s) => {
                      s.removeClass("collapsed");
                    });*/
                    cy.fit([ele, succ, edges], 16);
                  },
                  enabled: true
      
                      // whether the command is selectable
                  },
                  { 
                    content: "Delete",
                    contentStyle: {},
                    select: function (ele) {
                      handleOpenDelete(ele);
                      console.log("content of ele: ", ele);
                    },
                    enabled: true
                  },
                  {
                    content: "Add to my interests", // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      // a function to execute when the command is selected
                      let currInterest = ele.data()["label"];
                      addNewInterest(currInterest);
                      let msg =
                        "The interest " +
                        currInterest +
                        " has added to your interests";
                      toast.success(msg, {
                        toastId: "addLevel2"
                      }); // `ele` holds the reference to the active element
                    },
                    enabled: true // whether the command is selectable
                  }
                ];
               } else {
                return [
                  {
                    content: "Read more",
                    select: function(ele) {
                      const url = ele.data('url');
                      window.open(url, '_blank');
                    },
                    enabled: true
                  },
                  {
                    content: "Delete",
                    contentStyle: {},
                    select: function (ele) {
                      handleOpenDelete(ele);
                    },
                    enabled: true
                  }
                ];
              }
            }, // function( ele ){ return [ /*...*/ ] }, // a function that returns commands or a promise of commands
            fillColor: "black", // the background colour of the menu
            activeFillColor: "grey", // the colour used to indicate the selected command
            activePadding: 8, // additional size in pixels for the active command
            indicatorSize: 30, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
            separatorWidth: 3, // the empty spacing in pixels between successive commands
            spotlightPadding: 8, // extra spacing in pixels between the element and the spotlight
            adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
            //minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            //maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            openMenuEvents: "tap", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
            itemColor: "white", // the colour of text in the command's content
            itemTextShadowColor: "transparent", // the text shadow colour of the command's content
            zIndex: 9999, // the z-index of the ui div
            atMouse: false, // draw menu at mouse position
            outsideMenuCancel: 8 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel1 = {
            selector: "node[level=1]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: function (ele) { // an array of commands to list in the menu or a function that returns the array
              const id = ele.data("id");

              if (id >= -1) {
                // For nodes with id >= -1
                return [
                  {
                    // example command
                    // optional: custom background color for item
                    content: "Learn more", // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      // a function to execute when the command is selected
                      handleOpenLearn(ele); // `ele` holds the reference to the active element
                    },
                    enabled: true // whether the command is selectable
                  },
                  {
                    // example command
                    // optional: custom background color for item
                    content: "Expand", // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      //let id = ele.id()
                      //let node = ele.target;
                      ele.removeClass("expandable");
                      let succ = ele.successors().targets();

                      succ.map((s) => {
                        s.removeClass("collapsed");
                      }); // `ele` holds the reference to the active element
                    },
                    enabled: false
                    // whether the command is selectable
                  },
                  {
                    // example command
                    // optional: custom background color for item
                    content: "Add to my interests", // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      // a function to execute when the command is selected
                      // `ele` holds the reference to the active element
                    },
                    enabled: false // whether the command is selectable
                  },
                  /* {
                    content: "test ele.data()",
                    contentStyle: {},
                    select: function (ele) {
                      const data = ele.data();
                      console.log(data);
                    },
                    enabled: true,
                  } */
                ];
               } else {
                // For nodes with id < -1
                return [
                  /* {
                    content: "Learn more",
                    select: function (ele) {},
                    enabled: false,
                  }, */
              {
                content: "Expand",
                contentStyle: {},
                select: function (ele) {

                  /* if (relatedArticles.length === 6) {
                    elements.push(...relatedArticles); 
                    relatedArticles.push({classes: ["level2", "collapsed"]}); //unbedingt verbessern!
                    //console.log("Related articles for first manual added.");
                    //console.log(relatedArticles);
                  } */
                  const targetId = parseInt(ele.data("id"));

                  elements.forEach(element => {
                    if (element.data.target === targetId) {
                      // Remove "collapsed" class from the element
                      element.classes = element.classes.filter(cls => cls !== "collapsed");
                    }
                  });
                  //console.log("Elements after expanding:", elements);
                  cy.json(elements); //function that possibly reload the graph with new data without refreshing the page
                  handleExpandClick(ele);
              },
              enabled: true
  
                  // whether the command is selectable
              },
              {
                content: "Read more",
                select: function(ele) {
                  const url = ele.data('url');
                  window.open(url, '_blank');
                },
                enabled: true
              },
              {
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  handleOpenDelete(ele);
                },
                enabled: true
              }
                /* {
                  content: "test ele.data()",
                  contentStyle: {},
                  select: function (ele) {
                    const data = ele.data();
                    console.log(data);
                  },
                  enabled: true,
                } */
                ];
              }
            },
            fillColor: "black", // the background colour of the menu
            activeFillColor: "grey", // the colour used to indicate the selected command
            activePadding: 8, // additional size in pixels for the active command
            indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
            separatorWidth: 3, // the empty spacing in pixels between successive commands
            spotlightPadding: 8, // extra spacing in pixels between the element and the spotlight
            adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
            //minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            //maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            openMenuEvents: "tap taphold", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
            itemColor: "white", // the colour of text in the command's content
            itemTextShadowColor: "transparent", // the text shadow colour of the command's content
            zIndex: 9999, // the z-index of the ui div
            atMouse: false, // draw menu at mouse position
            outsideMenuCancel: 8 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel3 = {
            selector: "node[level=3]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: [
              // an array of commands to list in the menu or a function that returns the array

              {
                // example command
                // optional: custom background color for item
                content: "Learn more", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  // a function to execute when the command is selected
                  handleOpenLearn(ele); // `ele` holds the reference to the active element
                },
                enabled: true // whether the command is selectable
              },
              {
                // example command

                content: "Expand", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  //let id = ele.id()
                  //let node = ele.target;
                  //ele.removeClass("expandable");
                  //let succ = ele.successors().targets();

                  //succ.map((s) => {
                    //s.removeClass("collapsed");
                  //}); // `ele` holds the reference to the active element
                  let succ = ele.successors().targets();
                  let edges = ele.successors();
                  
                  edges.style("opacity", 0)
                  .style("background-color", "background-color")
                  .animate({
                    style: { opacity: 1 },
                    duration: 750,
                    easing: "ease-in-sine",
                    queue: false,
                    complete: function () {
                      edges.style("background-color", ele.css("background-color"));
                    }
                  });
            
                  succ.style("opacity", 0)
                    .style("background-color", "background-color")
                    .style("width", 0)
                    .style("height", 0)
                    .animate({
                      style: { opacity: 1, width: 200, height: 200 },
                      duration: 750, // Adjust the duration value to control the speed (in milliseconds)
                      easing: "ease-in-sine",
                      queue: false,
                      complete: function () {
                        succ.style("background-color", ele.css("background-color"));
                      }
                    });

                  let ids = [];
                  edges.map((e) => {
                    e.removeClass("collapsed1");
                    ids.push(
                      e.data()["target"],
                      e.data()["source"],
                      e.data()["id"]
                    );
                    console.log(ids, "test");
                  });

                  succ.map((s) => {
                    s.removeClass("collapsed1");
                  })
                  cy.fit([ele, succ, edges], 16);
                },
                enabled: true

                // whether the command is selectable
              },
              {
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  handleOpenDelete(ele);
                },
                enabled: true
              }, 
              {
                content: "Add to my interests", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  // a function to execute when the command is selected
                  let currInterest = ele.data()["label"];
                  addNewInterest(currInterest);
                  let msg =
                      "The interest " +
                      currInterest +
                      " has added to your interests";
                  toast.success(msg, {
                    toastId: "addLevel2"
                  }); // `ele` holds the reference to the active element
                },
                enabled: true // whether the command is selectable
              }
            ], // function( ele ){ return [ /*...*/ ] }, // a function that returns commands or a promise of commands
            fillColor: "black", // the background colour of the menu
            activeFillColor: "grey", // the colour used to indicate the selected command
            activePadding: 8, // additional size in pixels for the active command
            indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
            separatorWidth: 3, // the empty spacing in pixels between successive commands
            spotlightPadding: 8, // extra spacing in pixels between the element and the spotlight
            adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
            //minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            //maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            openMenuEvents: "tap taphold", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
            itemColor: "white", // the colour of text in the command's content
            itemTextShadowColor: "transparent", // the text shadow colour of the command's content
            zIndex: 9999, // the z-index of the ui div
            atMouse: false, // draw menu at mouse position
            outsideMenuCancel: 8 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel4 = {
            selector: "node[level=4]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: [
              // an array of commands to list in the menu or a function that returns the array

              {
                // example command
                // optional: custom background color for item
                content: "Learn more", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  // a function to execute when the command is selected
                  handleOpenLearn(ele); // `ele` holds the reference to the active element
                },
                enabled: true // whether the command is selectable
              },
              {
                // example command
                // optional: custom background color for item
                content: "Expand", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  //let id = ele.id()
                  //let node = ele.target;
                  ele.removeClass("expandable");
                  let succ = ele.successors().targets();

                  succ.map((s) => {
                    s.removeClass("collapsed");
                  });
                   
                  // `ele` holds the reference to the active element
                },
                enabled: false // whether the command is selectable
              },
              {
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  handleOpenDelete(ele);
                },
                enabled: true
              }, 
              {
                // example command
                // optional: custom background color for item
                content: "Add to my interests", // html/text content to be displayed in the menu
                contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                select: function (ele) {
                  // a function to execute when the command is selected
                  let currInterest = ele.data()["label"];
                  addNewInterest(currInterest);
                  let msg =
                      "The interest " +
                      currInterest +
                      " has added to your interests";
                  toast.success(msg, {
                    toastId: "addLevel2"
                  });
                  // `ele` holds the reference to the active element
                },
                enabled: true // whether the command is selectable
              }
            ], // function( ele ){ return [ /*...*/ ] }, // a function that returns commands or a promise of commands
            fillColor: "black", // the background colour of the menu
            activeFillColor: "grey", // the colour used to indicate the selected command
            activePadding: 8, // additional size in pixels for the active command
            indicatorSize: 24, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size,
            separatorWidth: 3, // the empty spacing in pixels between successive commands
            spotlightPadding: 8, // extra spacing in pixels between the element and the spotlight
            adaptativeNodeSpotlightRadius: true, // specify whether the spotlight radius should adapt to the node size
            //minSpotlightRadius: 24, // the minimum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            //maxSpotlightRadius: 38, // the maximum radius in pixels of the spotlight (ignored for the node if adaptativeNodeSpotlightRadius is enabled but still used for the edge & background)
            openMenuEvents: "tap taphold", // space-separated cytoscape events that will open the menu; only `cxttapstart` and/or `taphold` work here
            itemColor: "white", // the colour of text in the command's content
            itemTextShadowColor: "transparent", // the text shadow colour of the command's content
            zIndex: 9999, // the z-index of the ui div
            atMouse: false, // draw menu at mouse position
            outsideMenuCancel: 8 // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          }
          let menu4 = cy.cxtmenu(defaultsLevel4); //Pia: 
          let menu2 = cy.cxtmenu(defaultsLevel2);
          let menu1 = cy.cxtmenu(defaultsLevel1);
          let menu3 = cy.cxtmenu(defaultsLevel3);
          let menu0 = cy.cxtmenu(defaultsLevel0);

          /*
        cy.on("tap", "node", function (evt) {
          let node = evt.target;
          let succ = node.successors().targets();
         succ.map((s)=>{
            s.removeClass("collapsed")
         })

        })*/
        }}
      />
      <Dialog open={modalOpen} onClose={handleCloseModal}>
        <DialogTitle>Please enter an interest that you would like to add:</DialogTitle>
        <DialogContent>
          <TextField id="keywordInput" type="text" value={keyword} onChange={handleKeywordChange} fullWidth />
          <Button variant="contained" onClick={handleSearchArticles} color="primary">
            Search
          </Button>
          <List>
            {articles.map((article, index) => (
              <ListItem
                button
                key={index}
                onClick={() => {
                  handleSelectArticle(article);
                  handleCloseModal();
                }}
              >
                <ListItemText primary={article.title} />
                <Button
                  variant="outlined"
                  onClick={(event) => {
                    handlePreviewArticle(event, article);
                  }}
                  endIcon={
                    <>
                      <img src={WikipediaLogo} alt="Wikipedia logo" style={{ height: '25px', width: '25px', marginRight: '8px'}} />
                      <SvgIcon component={OpenInNew} />
                    </>
                  }
                >
                  Read more
                </Button>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCloseModal} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={isExpandDialogOpen} onClose={handleExpandDialogClose} style={{ visibility: 'hidden' }}>
        <DialogTitle>Expand</DialogTitle>
        <DialogContent>
          {/* Content of the dialog */}
          {selectedNode && (
            <div>
              <p>Pop-up window content for node {selectedNode.id()} goes here.</p>
              <p>Desired content</p>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExpandDialogClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteOpen.openDelete} onClose={handleCloseDelete}>
        {deleteOpen.nodeObj !== null ? (
        <DialogTitle>Are you sure you want to delete the interest: {deleteOpen.nodeObj.label} ?</DialogTitle> 
        ): (
        <DialogTitle></DialogTitle>  
        )}
        <DialogActions>
          <Button variant="contained" onClick={handleCloseDelete} color="primary">
            Cancel
          </Button>
          <Button variant="contained" onClick={() => {
            deleteInterest(deleteOpen.nodeObj);
            handleCloseDelete();
            }} color="secondary">
          Delete
          </Button>
          </DialogActions>
      </Dialog>
    </>
  );
};

export default NodeLink;

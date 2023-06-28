import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import React, {useEffect, useState} from "react"
//import './cytoscape.css';

import { Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, TextField, Button, DialogActions } from '@material-ui/core';
//import data from "./data";
import cxtmenu from "cytoscape-cxtmenu";
import WikiDesc from "../Connect/WikiDesc";
import {toast, ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RestAPI from "../../../../../Services/api";

cytoscape.use(cxtmenu);

function getColor(currColors) {
  const allColors = [
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
  console.log(elements);
  try {
    data.map((d) => {
      let colors = getColor(currColors);
      currColors = colors[1];
      let label = d.title;
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
        data: {source: -1, target: idLevel1, color: color},
        classes: ["level1"]
      };
      elements.push(element, edge);

      explore.map((e) => {
        label = e.title;
        //idLevel2=idTarget+1
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
          data: {target: idLevel2, source: idLevel1, color: color},
          classes: ["level2"]
        };

        elements.push(element, edge);

        let relatedTopics = e.relatedTopics;

        relatedTopics.map((r) => {
          let idLevel3 = ids.pop();
          label = r.title;
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
            data: {target: idLevel3, source: idLevel2, color: color},
            classes: ["collapsed", "level3"]
          };
          elements.push(element, edge);
        });
      });
    })
  } catch{
    elements = [
      {data: {id: -1, label: "Sorry, an error occurred.", level: 0, color: "red"}}
    ];
  };

  return elements;
}

const NodeLink = (props) => {
  const {data, keywords} = props;
  const [elements, setElements] = useState([]);
  const [openDialog, setOpenDialog] = useState({
    openLearn: null,
    openAdd: null
  });



  const handleOpenLearn = (ele) => {
    const data = ele.data();
    setOpenDialog({...openDialog, openLearn: true, nodeObj: data});
  };
  const handleCloseLearn = () => {
    setOpenDialog({...openDialog, openLearn: false});
  };

  const validateInterest = (interests, interest) => {
    return interests.some((i) => i.text === interest.toLowerCase());
  };

  const addNewInterest = async (currInterest) => {
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
  }

  //const [state, setState]=useState(getElements(data))

  useEffect(() => {
    const elementsCurr = getElements(data);
    console.log(elementsCurr);

    setElements([]);
    setElements(elementsCurr);
  }, [data]);

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
    }
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [articles, setArticles] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [relatedArticles, setRelatedArticles] = useState([]);

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

  useEffect(() => {
    window.handleResponse = (data) => {
      const fetchedArticles = data.query.search.map((article) => ({
        title: article.title,
        link: `https://en.wikipedia.org/wiki/${article.title.replaceAll(' ', '_')}`,
      }));
      setArticles(fetchedArticles);
    };
  }, []);

  const handleSelectArticle = (article) => {
    const isDuplicate = selectedArticles.some(
      (selectedArticle) => selectedArticle.title === article.title
    );
  
    if (isDuplicate) {
      const message = "You have already added " + article.title + " to your interests";
      toast.error(message, {
        toastId: "duplicateInterest",
        containerId: "toastContainer",
        className: "custom-toast-error",
      });
      return;
    } else {
      const newSelectedArticles = [...selectedArticles, article];
      setSelectedArticles(newSelectedArticles);
  
      console.log(newSelectedArticles);
      console.log(selectedArticles);
  
      const newNodeId = -2 - selectedArticles.length;
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
      
      console.log(elements);
    }
  };

  useEffect(() => {
    window.handleRelatedResponse = (data) => {
      const pageId = Object.keys(data.query.pages)[0];
      const currentLength = relatedArticles.length;
      const newRelatedArticles = data.query.pages[pageId].links.map((link, index) => {
        const targetId = -2 - Math.floor((currentLength + index) / 6);
        const sourceId = 250 + index + currentLength;
        const newNode = {
          data: {
            id: sourceId,
            target: targetId,
            label: link.title,
            level: 2, 
            color: "#808080",
            pageData: "",
            url: `https://en.wikipedia.org/wiki/${link.title.replaceAll(' ', '_')}`,
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
            source: sourceId,
            target: targetId,
            color: "#808080",
          },
          classes: ["level2"],
        };
  
        console.log(elements);
        elements.push(newNode, newEdge); // Add newNode and newEdge to the elements array
        console.log(elements);

        return [newNode, newEdge]; // Return an array of node and edge objects
      });
  
      setRelatedArticles((prevArticles) => [...prevArticles, ...newRelatedArticles.flat()]);
      console.log(relatedArticles);

    };
  }, [relatedArticles]);

  useEffect(() => {
  console.log(relatedArticles);
}, [relatedArticles]);

useEffect(() => {
  console.log(elements);
}, [elements]);

  /* //similar function needed
  const getRelatedForManuals = async (target)=>{

    const title={"interest":target}
    const response = await RestAPI.getSimiliarInterestData(title)

    const {data} = response

    console.log(data);
  } */

  return (
    <>
      <CytoscapeComponent
        style={{width: "100%", height: "800px", backgroundColor: "#F8F4F2"}} //creating space for nodes (rectangle)
        layout={layoutGraph}
        stylesheet={stylesheet}
        elements={elements}
        cy={(cy) => {
          cy.elements().remove();
          cy.add(elements);
          cy.layout(layoutGraph);
          cy.layout(layoutGraph).run();

          cy.fit();

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
            commands: [
              // an array of commands to list in the menu or a function that returns the array

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
                  .animate({
                    style: { opacity: 1 },
                    duration: 600,
                    easing: "ease-in-sine",
                    queue: false
                  });
              
                  succ.style("opacity", 0)
                    .animate({
                      style: { opacity: 1 },
                      duration: 600,
                      easing: "ease-in-sine",
                      queue: false
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
                  let currInterest = ele.data()["label"];
                  let msg = "The interest " + currInterest + " has been removed";
                  toast.error(msg, { toastId: "removedLevel2" });
              
                  ele.animate({
                    style: { opacity: 0, width: 0, height: 0 },
                    duration: 600,
                    easing: "ease-in-sine",
                    queue: false,
                    complete: function () {
                      ele.addClass("collapsed");
                      ele.remove();
                    }
                  });
              
                  let edges = ele.connectedEdges();
              
                  edges.animate({
                    style: { opacity: 0, width: 0 },
                    duration: 600,
                    easing: "ease-in-sine",
                    queue: false,
                    complete: function () {
                      edges.remove();
                    }
                  });
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
                      if (relatedArticles.length === 6) {
                        elements.push(...relatedArticles);
                        relatedArticles.push({});
                        console.log("Related articles for first manual added.");
                        console.log(relatedArticles);
                      }
                      const targetId = parseInt(ele.data("id"));

                      elements.forEach(element => {
                        if (element.data.target === targetId) {
                          // Remove "collapsed" class from the element
                          element.classes = element.classes.filter(cls => cls !== "collapsed");
                        }
                      });
                      console.log(elements);
                      cy.json(elements); //function that possibly reload the graph with new data without refreshing the page
                  },
                  enabled: true
  
                  // whether the command is selectable
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
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  let currInterest = ele.data()["label"];
                  let msg = "The interest " + currInterest + " has been removed";
                  toast.error(msg, { toastId: "removedLevel2" });
              
                  ele.animate({
                    style: { opacity: 0, width: 0, height: 0 },
                    duration: 600,
                    easing: "ease-in-sine",
                    queue: false,
                    complete: function () {
                      ele.addClass("collapsed");
                      ele.remove();
                    }
                  });
              
                  let edges = ele.connectedEdges();
              
                  edges.animate({
                    style: { opacity: 0, width: 0 },
                    duration: 600,
                    easing: "ease-in-sine",
                    queue: false,
                    complete: function () {
                      edges.remove();
                    }
                  });
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
              <ListItem button key={index} onClick={() => {
                handleSelectArticle(article);
                handleCloseModal();
              }}>
                <ListItemText primary={article.title} />
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
    </>
  );
};

export default NodeLink;

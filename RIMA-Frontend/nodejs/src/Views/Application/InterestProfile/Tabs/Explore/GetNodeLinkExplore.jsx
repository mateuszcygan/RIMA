import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import React, { useEffect, useState, useRef } from "react";
//import './cytoscape.css';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
  DialogActions,
  SvgIcon,
} from "@material-ui/core";
import { OpenInNew } from "@material-ui/icons";
//import data from "./data";
import cxtmenu from "cytoscape-cxtmenu";
import WikiDesc from "../Connect/WikiDesc";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RestAPI from "../../../../../Services/api";
import WikipediaLogo from "./Wikipedia-logo.png";

cytoscape.use(cxtmenu);

//default color palette (color button)
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
  "#98B9F2",
];

//additional function parameter for colors added (color button)
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
    { data: { id: -1, label: "My Interests", level: 0, color: "black" } },
  ];

  let currColors = [];
  let uniqueTitles = [];

  try {
    data.map((d) => {
      let colors = getColor(currColors, colorPalette);
      currColors = colors[1];
      let label = d.title;

      //check if the interest title is already added (get rid of doublings)
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
            url: d.url,
          },
          classes: ["level1"],
        };
        let edge = {
          data: { source: -1, target: idLevel1, color: color },
          classes: ["level1"],
        };
        elements.push(element, edge);

        explore.map((e) => {
          label = e.title;
          //check if the related topic title is already added (get rid of doublings)
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
                url: e.wikiURL,
              },
              classes: ["level2"],
            };
            edge = {
              data: { target: idLevel2, source: idLevel1, color: color },
              classes: ["level2"],
            };

            elements.push(element, edge);

            let relatedTopics = e.relatedTopics;

            relatedTopics.map((r) => {
              let idLevel3 = ids.pop();
              label = r.title;

              //check if the related topic title is already added (get rid of doublings)
              if (!uniqueTitles.includes(label)) {
                uniqueTitles.push(label);
                element = {
                  data: {
                    id: idLevel3,
                    label: label,
                    level: 3,
                    color: color,
                    pageData: r.summary,
                    url: r.wikiURL,
                  },
                  classes: ["collapsed", "level3"],
                };
                edge = {
                  data: { target: idLevel3, source: idLevel2, color: color },
                  classes: ["collapsed", "level3"],
                };
                elements.push(element, edge);

                //handle appropriately interests from additional layer(generate new layer of interests)
                let currRelatedTopics = r.currRelatedTopics;

                currRelatedTopics.map((c) => {
                  let idLevel4 = ids.pop();
                  label = c.title;

                  if (!uniqueTitles.includes(label)) {
                    uniqueTitles.push(label);
                    element = {
                      data: {
                        id: idLevel4,
                        label: label,
                        level: 4,
                        color: color,
                        pageData: c.summary,
                        url: c.wikiURL,
                      },
                      classes: ["collapsed1", "level4"],
                    };
                    edge = {
                      data: {
                        target: idLevel4,
                        source: idLevel3,
                        color: color,
                      },
                      classes: ["collapsed1", "level4"],
                    };
                    elements.push(element, edge);
                  }
                });
              }
            });
          }
        });
      }
    });
  } catch {
    console.log("error data", data);
    elements = [
      {
        data: {
          id: -1,
          label: "Sorry, an error occurred.",
          level: 0,
          color: "red",
        },
      },
    ];
  }

  return [elements, currColors];
}

const NodeLink = (props) => {
  const { data, keywords, setKeywords, colors } = props;
  const [elements, setElements] = useState([]);
  const [openDialog, setOpenDialog] = useState({
    openLearn: null,
    openAdd: null,
  });
  const [deleteOpen, setDeleteOpen] = useState({
    openDelete: null,
    nodeObj: null,
  });

  const handleOpenLearn = (ele) => {
    const data = ele.data(); //parameter that is passed to deleteInterests function (delete button)
    setOpenDialog({ ...openDialog, openLearn: true, nodeObj: data });
  };
  const handleCloseLearn = () => {
    setOpenDialog({ ...openDialog, openLearn: false });
  };

  const validateInterest = (interests, interest) => {
    return interests.some((i) => i.text === interest.toLowerCase());
  };

  const handleOpenDelete = (ele) => {
    const data = ele.data();
    setDeleteOpen({ ...deleteOpen, openDelete: true, nodeObj: data });
  };

  const handleCloseDelete = () => {
    setDeleteOpen({ ...deleteOpen, openDelete: false });
  };

  //create a ref to store the cytoscape instance (delete button: needed for deleting related interests when a certain interest is deleted)
  const cyRef = useRef(null);

  //function to get the cytoscape instance (delete button)
  const getCytoscapeInstance = () => {
    return cyRef.current;
  };

  //function to find a node within CytoscapeComponent with a specific id that returns ele.data() (delete button: needed for deleteInterest)
  const findNode = (cy, nodeId) => {
    const ele = cy.nodes().filter((node) => node._private.data.id === nodeId);
    return ele.data();
    //console.log(`data.() of element with ${nodeId}: `, ele.data());
  };

  //function that is responsible for deleting a certain interest and its related nodes (delete button)
  const deleteInterest = async (element) => {
    const cy = getCytoscapeInstance();
    //console.log("cytoscape instance", cy);

    //store an id of an interest that should be deleted
    let elementId = element.id;
    //console.log("element to delete (id, title):", elementId, elementTitle);

    //find the index of the element that should be deleted in the 'elements' array
    const elementIndex = elements.findIndex(
      (element) => element.data.id === elementId
    );
    //console.log("index of an element that should be deleted: ", elementIndex);

    //remove the element
    elements.splice(elementIndex, 1);

    //find an edge that connects the deleted interest with the rest of the diagram (edge to be deleted is 'target' there)
    const elementEdge = elements.find(
      (element) => element.data.target === elementId
    );
    //console.log("edge that connects deleted interest to the diagram:", elementEdge);

    //delete an edge that connects the deleted interest with the rest of the diagram
    if (elementEdge) {
      const elementEdgeIndex = elements.indexOf(elementEdge);
      elements.splice(elementEdgeIndex, 1);
    }

    //filter edges that start at interest that should be deleted (source) and target at related interests
    const connectedEdges = elements.filter(
      (element) => element.data.source === elementId
    );
    //console.log("edges that go out of deleted interest: ", connectedEdges);

    //delete edges that start at interest that should be deleted at target at related interests
    connectedEdges.forEach((edge) => {
      const edgeIndex = elements.findIndex((element) => element === edge);
      elements.splice(edgeIndex, 1);
    });

    //create an array that stores nodes of related interests
    //(needed for recursive call - further interests should also be deleted)
    const relatedInterests = [];

    //find nodes of related interests that were connected to the graph with connectedEdges (edges that go out of interests that should be deleted)
    connectedEdges.forEach((edge) => {
      //console.log("edge target: ", edge.data.target);
      const relatedInterest = elements.filter(
        (element) => element.data.id === edge.data.target
      );
      relatedInterests.push(relatedInterest);
    });

    const flattenedRelatedInterests = relatedInterests.flat();
    //console.log("related interests to deleted node: ", flattenedRelatedInterests);

    //call recursively 'deleteInterest' for every related interest
    if (relatedInterests.length !== 0) {
      flattenedRelatedInterests.forEach((relatedInterest) => {
        const relatedInterestToDelete = findNode(cy, relatedInterest.data.id);
        deleteInterest(relatedInterestToDelete);
      });
    }
    try {
      const msg = "The delete operation completed successfully.";
      toast.success(msg, {
        toastId: "addLevel2",
        autoClose: 3000, // Display for 3 seconds
      });
    } catch (err) {
      console.log("Error adding interest:", err);
      toast.error("Failed to remove the interest. Please try again later.", {
        toastId: "addLevel2",
        autoClose: 3000, // Display for 3 seconds
      });
    }
  };

  //ADD FUNKTION WURDE geändert, die alte ist unten
  const addNewInterest = async (currInterest) => {
    const alreadyExist = keywords.some(
      (interest) => interest.text === currInterest.toLowerCase()
    );

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
        toastId: "addLevel2",
      });
    } catch (error) {
      console.error("Error adding interest:", error);
      toast.error("Failed to add the interest. Please try again later.", {
        toastId: "addLevel2",
      });
    }
  };

  //useEffect - when NodeLink.colors are changed (check box in color button), then graph should be rendered with new colors (color button)
  useEffect(() => {
    colorPalette = NodeLink.colors;
    const elementsCurr = getElements(data);
    //console.log(elementsCurr);

    setElements([]);
    setElements(elementsCurr[0]);
    console.log(elements); //color button
  }, [data, NodeLink.colors]);

  const layoutGraph = {
    name: "concentric",
    concentric: function (node) {
      return 10 - node.data("level");
    },
    levelWidth: function () {
      return 1;
    },
  };

  const stylesheet = [
    {
      selector: "node",
      style: {
        width: 200,
        height: 200,
        label: "data(label)",
        "background-color": "data(color)",
        color: "white",
      },
    },
    {
      selector: "edge",
      style: {
        "curve-style": "straight",
      },
    },
    {
      selector: "node[label]",
      style: {
        "text-halign": "center",
        "text-valign": "center",
        "text-wrap": "wrap",
        "text-max-width": 20,
        "font-size": 24,
      },
    },
    {
      selector: ".collapsed",
      style: {
        display: "none",
      },
    },
    {
      selector: ".collapsed1",
      style: {
        display: "none",
      },
    },
    {
      selector: ".level1",
      style: {
        "line-color": "data(color)",
        color: "white",
      },
    },
    {
      selector: ".level2",
      style: {
        "background-opacity": 0.6,
        "line-color": "data(color)",
      },
    },
    {
      selector: ".level3",
      style: {
        "background-opacity": 0.4,
        "line-color": "data(color)",
      },
    },
    {
      selector: ".level4",
      style: {
        "background-opacity": 0.3,
        "line-color": "data(color)",
      },
    },
  ];

  //states needed to manage manual adding of nodes (manual adding of interests)
  const [modalOpen, setModalOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [articles, setArticles] = useState([]);
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

  //display Wikipedia articles based on user's keyword (manual adding of interests)
  const handleSearchArticles = () => {
    if (keyword.trim() === "") {
      toast.error("Your input field is empty", {
        toastId: "emptyInput",
        containerId: "toastContainer",
        className: "custom-toast-error",
        autoClose: 3000, // 3 seconds
      });
      return; //stop further execution
    } else {
      const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${keyword}&srlimit=3&callback=handleArticlesSearch`;

      const script = document.createElement("script");
      script.src = url;
      document.head.appendChild(script);
    }
  };

  //function to handle articles displayed after user enters the keyword (manual adding of interests)
  window.handleArticlesSearch = (data) => {
    const fetchedArticles = data.query.search.map((article) => ({
      title: article.title,
      link: `https://en.wikipedia.org/wiki/${article.title.replaceAll(
        " ",
        "_"
      )}`,
    }));
    setArticles(fetchedArticles);
  };

  //function responsible for adding an interest from a list to the graph (manual adding of interests)
  const handleSelectArticle = (article) => {
    //prevent form adding interests that are already contained in the graph
    const isDuplicate = elements.some(
      (element) => element.data.label === article.title
    );
    console.log("isDuplicate", isDuplicate);

    if (isDuplicate) {
      const message =
        "You have already added " + article.title + " to your interests";
      toast.error(message, {
        toastId: "duplicateInterest",
        containerId: "toastContainer",
        className: "custom-toast-error",
      });
      return;
    } else {
      //id for manual added nodes is determined by the length of related articles (values: -2, -3, -4...)
      //there are always 3 related articles (6 cytoscape components) => therefore divided by 6
      //after removing manual added node, related articles are also removed
      const newNodeId = -2 - relatedArticles.length / 6;

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
          width: 185,
          height: 185,
          shape: "octagon",
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

      //fetch 3 related articles based on interest that is selected
      const relatedUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=links&pllimit=3&titles=${article.title}&callback=handleRelatedArticles`;

      const script = document.createElement("script");
      script.src = relatedUrl;
      document.head.appendChild(script);
    }
  };

  //handle interests that are related to manual added interest - create cytoscape elements with level 2 (manual adding of interests)
  window.handleRelatedArticles = (data) => {
    const pageId = Object.keys(data.query.pages)[0];
    const currentLength = relatedArticles.length;
    const links = data.query.pages[pageId].links;

    const newRelatedArticles = links.map((link, index) => {
      const sourceId = -2 - currentLength / 6;
      const targetId = 250 + index + currentLength;
      const newNode = {
        data: {
          id: targetId,
          source: sourceId,
          label: link.title,
          level: 2,
          color: "#808080",
          pageData: "",
          url: `https://en.wikipedia.org/wiki/${link.title.replaceAll(
            " ",
            "_"
          )}`,
        },
        classes: ["level2", "collapsed"],
        style: {
          width: 185,
          height: 185,
          shape: "octagon",
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
      elements.push(newNode, newEdge);

      return [newNode, newEdge];
    });

    setRelatedArticles((prevArticles) => [
      ...prevArticles,
      ...newRelatedArticles.flat(),
    ]);

    //console.log("related articles", relatedArticles);
  };

  //function to open the Wikipedia page in a new tab - "Read more" option (manual adding of interests)
  const handlePreviewArticle = (event, article) => {
    event.stopPropagation();
    window.open(
      `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
      "_blank"
    );
  };

  //workaround with pop-up window, so that related interests of manual added nodes are rendered in the graph (manual adding of interests)
  useEffect(() => {
    let timeoutId;
    if (isExpandDialogOpen) {
      timeoutId = setTimeout(() => {
        handleExpandDialogClose();
      }, 0.001); //timeout very small
    }
    console.log("color button:", elements);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isExpandDialogOpen]);

  return (
    <>
      <CytoscapeComponent
        style={{
          width: "100%",
          height: "800px",
          backgroundColor: "#F8F4F2",
          fontSize: 11.25,
        }} //font size - adjust size of strings from the menu that is displayed after clicking on nodes (adjust capitalization)
        layout={layoutGraph}
        stylesheet={stylesheet}
        elements={elements}
        cy={(cy) => {
          cyRef.current = cy; //store the cytoscape instance in the ref (delete button)

          cy.elements().remove();
          cy.add(elements);
          cy.layout(layoutGraph);
          cy.layout(layoutGraph).run();

          //after hovering over nodes, the default cursor changes to pointer (hand icon)
          cy.fit();
          cy.on("mouseover", "node", (event) => {
            if (event.cy.container("node")) {
              event.cy.container("node").style.cursor = "pointer";
            }
          });
          cy.on("mouseout", "node", (event) => {
            if (event.cy.container("node")) {
              event.cy.container("node").style.cursor = "default";
            }
          });

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
            outsideMenuCancel: 8, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel2 = {
            selector: "node[level=2]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: function (ele) {
              // an array of commands to list in the menu or a function that returns the array
              const id = ele.data("id");

              //defaultsLevel2 contains default interests' nodes (ids from 0 to 200) and nodes with related interests of manual added interests (ids that are bigger than 250)
              //nodes with id < -1 are not contained (manual added nodes)

              //options that are displayed after clicking on the default nodes - with id > -1 && id < 250 (manual adding of interests)
              if (id < 250) {
                return [
                  {
                    content: "Learn more", // html/text content to be displayed in the menu
                    contentStyle: {}, // css key:value pairs to set the command's css in js if you want
                    select: function (ele) {
                      // a function to execute when the command is selected
                      handleOpenLearn(ele); // `ele` holds the reference to the active element
                    },
                    enabled: true, // whether the command is selectable
                  },
                  {
                    content: "Expand",
                    contentStyle: {},
                    select: function (ele) {
                      let succ = ele.successors().targets();
                      let edges = ele.successors();

                      //animation for edges after clicking on 'Expand' (indication after deleting/expanding)
                      edges
                        .style("opacity", 0)
                        .style("background-color", "background-color")
                        .animate({
                          style: { opacity: 1 },
                          duration: 750,
                          easing: "ease-in-sine",
                          queue: false,
                          complete: function () {
                            edges.style(
                              "background-color",
                              ele.css("background-color")
                            );
                          },
                        });

                      //animation for nodes after clicking on 'Expand' (indication after deleting/expanding)
                      succ
                        .style("opacity", 0)
                        .style("background-color", "background-color")
                        .style("width", 0)
                        .style("height", 0)
                        .animate({
                          style: { opacity: 1, width: 200, height: 200 },
                          duration: 750,
                          easing: "ease-in-sine",
                          queue: false,
                          complete: function () {
                            succ.style(
                              "background-color",
                              ele.css("background-color")
                            );
                          },
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

                      cy.fit([ele, succ, edges], 16);
                    },
                    enabled: true, // whether the command is selectable
                  },
                  {
                    content: "Delete",
                    contentStyle: {},
                    select: function (ele) {
                      handleOpenDelete(ele);
                      console.log("content of ele: ", ele);
                    },
                    enabled: true,
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
                        toastId: "addLevel2",
                      }); // `ele` holds the reference to the active element
                    },
                    enabled: true, // whether the command is selectable
                  },
                ];
              } else {
                //options that are displayed after clicking on the nodes that represent the related interests of manual added nodes - id > 250 (manual adding of interests)
                return [
                  {
                    content: "Read more",
                    select: function (ele) {
                      const url = ele.data("url");
                      window.open(url, "_blank");
                    },
                    enabled: true,
                  },
                  {
                    content: "Delete",
                    contentStyle: {},
                    select: function (ele) {
                      handleOpenDelete(ele);
                    },
                    enabled: true,
                  },
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
            outsideMenuCancel: 8, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let defaultsLevel1 = {
            selector: "node[level=1]",
            menuRadius: 75, // the outer radius (node center to the end of the menu) in pixels. It is added to the rendered size of the node. Can either be a number or function as in the example.
            //selector: "node", // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: function (ele) {
              // an array of commands to list in the menu or a function that returns the array
              const id = ele.data("id");

              //defaultsLevel2 contains default interests' nodes (ids from 0 to 200) and nodes that were manually added (ids that are smaller than -1)
              //nodes with id > 250 are not contained (related interests for manual added nodes)

              //options that are displayed after clicking on the default nodes - with id > -1 && id < 250 (manual adding of interests)
              if (id > -1) {
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
                    enabled: true, // whether the command is selectable
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
                    enabled: false,
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
                    enabled: false, // whether the command is selectable
                  },
                ];
              } else {
                //options that are displayed after clicking on the nodes that were manually added - with id < -1 (manual adding of interests)
                return [
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
                      const sourceId = parseInt(ele.data("id"));

                      elements.forEach((element) => {
                        if (element.data.source === sourceId) {
                          //remove "collapsed" class from the element
                          element.classes = element.classes.filter(
                            (cls) => cls !== "collapsed"
                          );
                        }
                      });
                      //console.log("Elements after expanding:", elements);
                      cy.json(elements);
                      handleExpandClick(ele);
                    },
                    enabled: true, // whether the command is selectable
                  },
                  {
                    content: "Read more",
                    select: function (ele) {
                      const url = ele.data("url");
                      window.open(url, "_blank");
                    },
                    enabled: true,
                  },
                  {
                    content: "Delete",
                    contentStyle: {},
                    select: function (ele) {
                      handleOpenDelete(ele);
                    },
                    enabled: true,
                  },
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
            outsideMenuCancel: 8, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
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
                enabled: true, // whether the command is selectable
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

                  //animation for edges after clicking on 'Expand' (indication after deleting/expanding)
                  edges
                    .style("opacity", 0)
                    .style("background-color", "background-color")
                    .animate({
                      style: { opacity: 1 },
                      duration: 750,
                      easing: "ease-in-sine",
                      queue: false,
                      complete: function () {
                        edges.style(
                          "background-color",
                          ele.css("background-color")
                        );
                      },
                    });

                  //animation for nodes after clicking on 'Expand' (indication after deleting/expanding)
                  succ
                    .style("opacity", 0)
                    .style("background-color", "background-color")
                    .style("width", 0)
                    .style("height", 0)
                    .animate({
                      style: { opacity: 1, width: 200, height: 200 },
                      duration: 750,
                      easing: "ease-in-sine",
                      queue: false,
                      complete: function () {
                        succ.style(
                          "background-color",
                          ele.css("background-color")
                        );
                      },
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
                  });
                  cy.fit([ele, succ, edges], 16);
                },
                enabled: true, // whether the command is selectable
              },
              {
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  handleOpenDelete(ele);
                },
                enabled: true,
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
                    toastId: "addLevel2",
                  }); // `ele` holds the reference to the active element
                },
                enabled: true, // whether the command is selectable
              },
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
            outsideMenuCancel: 8, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          //commands for second expandable layer (generate new layer of interests)
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
                enabled: true, // whether the command is selectable
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
                enabled: false, // whether the command is selectable
              },
              {
                content: "Delete",
                contentStyle: {},
                select: function (ele) {
                  handleOpenDelete(ele);
                },
                enabled: true,
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
                    toastId: "addLevel2",
                  });
                  // `ele` holds the reference to the active element
                },
                enabled: true, // whether the command is selectable
              },
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
            outsideMenuCancel: 8, // if set to a number, this will cancel the command if the pointer is released outside of the spotlight, padded by the number given
          };

          let menu4 = cy.cxtmenu(defaultsLevel4); //set commands for second expandable layer (generate new layer of interests)
          let menu2 = cy.cxtmenu(defaultsLevel2);
          let menu1 = cy.cxtmenu(defaultsLevel1);
          let menu3 = cy.cxtmenu(defaultsLevel3);
          let menu0 = cy.cxtmenu(defaultsLevel0);
        }}
      />
      <Dialog open={openDialog.openLearn} onClose={handleCloseLearn}>
        {openDialog.nodeObj != null ? (
          <DialogTitle>Learn More about {openDialog.nodeObj.label}</DialogTitle>
        ) : (
          <DialogTitle>Learn more</DialogTitle>
        )}
        <DialogContent>
          {""}
          <WikiDesc data={openDialog.nodeObj} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLearn}>Close</Button>
        </DialogActions>
      </Dialog>
      <ToastContainer />

      {/* modal (manual adding of interests) */}
      <Dialog open={modalOpen} onClose={handleCloseModal}>
        <DialogTitle>
          Please enter an interest that you would like to add:
        </DialogTitle>
        <DialogContent>
          <TextField
            id="keywordInput"
            type="text"
            value={keyword}
            onChange={handleKeywordChange}
            fullWidth
          />
          <Button
            variant="contained"
            onClick={handleSearchArticles}
            color="primary"
          >
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
                      <img
                        src={WikipediaLogo}
                        alt="Wikipedia logo"
                        style={{
                          height: "25px",
                          width: "25px",
                          marginRight: "8px",
                        }}
                      />
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
          <Button
            variant="contained"
            onClick={handleCloseModal}
            color="secondary"
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* workaround with pop-up window, so that related interests of manual added nodes are rendered in the graph (manual adding of interests) */}
      <Dialog
        open={isExpandDialogOpen}
        onClose={handleExpandDialogClose}
        style={{ visibility: "hidden" }}
      >
        {" "}
        {/* it is never displayed */}
        <DialogTitle>Expand</DialogTitle>
        <DialogContent>
          {/* content of the dialog */}
          {selectedNode && (
            <div>
              <p>
                Pop-up window content for node {selectedNode.id()} goes here.
              </p>
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

      {/* delete confirmation modal (delete button) */}
      <Dialog open={deleteOpen.openDelete} onClose={handleCloseDelete}>
        {deleteOpen.nodeObj !== null ? (
          <DialogTitle>
            Are you sure you want to delete the interest:{" "}
            {deleteOpen.nodeObj.label} ?
          </DialogTitle>
        ) : (
          <DialogTitle></DialogTitle>
        )}
        <DialogActions>
          <Button
            variant="contained"
            onClick={handleCloseDelete}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              deleteInterest(deleteOpen.nodeObj);
              handleCloseDelete();
            }}
            color="secondary"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NodeLink;

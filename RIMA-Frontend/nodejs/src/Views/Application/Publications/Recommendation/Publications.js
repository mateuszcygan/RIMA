import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Modal,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
} from "@material-ui/core";

import CloseIcon from "@material-ui/icons/Close";

import Seperator from "./Components/Seperator";
import { WhatIfGeneral } from "./Components/WhatIfGeneral.jsx";
import { handleServerErrors } from "Services/utils/errorHandler";
import InterestsTags from "./TagSearch.js";
import PaperCard from "./PaperCard.js";
import RestAPI from "Services/api";
import ScrollTopWrapper from "../../ReuseableComponents/ScrollTopWrapper/ScrollTopWrapper";
import {
  pink,
  purple,
  indigo,
  blue,
  cyan,
  teal,
  green,
  lime,
  amber,
  brown,
} from "@material-ui/core/colors";
import CloudChart from "../../ReuseableComponents/Charts/CloudChart/CloudChart";
import CloudQueueIcon from "@material-ui/icons/CloudQueue";

export default function PublicationRecommendation() {
  const [state, setState] = useState({
    papersLoaded: false,
    interests: [],
    papers: [],
    loading: true,
    modal: false,
    threshold: 40,
    //New States added by Tannaz
    // whatModal: false,
  });

  useEffect(() => {
    getInterests();
  }, []);

  useEffect(() => {
    getRecommendedPapers();
  }, [state.interests]);

  //Jaleh - Apply changes from what-if general
  const handleApplyGeneralChanges = (newInterests) => {
    closeWhatIfModal();
    setState({
      ...state,
      interests: newInterests,
      loading: true,
      modal: false,
    });
  };

  //Jaleh - Apply local changes of a paper
  const handleApplyWhatIfChanges = (index, newPaperProps, ref) => {
    setState({
      ...state,
      loading: true,
    });
    const newPaperList = state.papers.filter(function (obj) {
      return obj.paperId !== index;
    });
    if (newPaperProps.score > newPaperProps.threshold) {
      newPaperList.push(newPaperProps);

      newPaperList.sort((a, b) => {
        return b.score - a.score;
      });
    }
    const timer = setTimeout(() => {
      setState({
        ...state,
        papers: newPaperList,
        loading: false,
      });
    }, 2000);
  };

  //Jaleh - What if modal:
  const openWhatIfModal = () => {
    setState({
      ...state,
      modal: true,
    });
  };
  const closeWhatIfModal = (id) => {
    setState({
      ...state,
      modal: false,
    });
  };
  //What modal - Tannaz:
  const openWhatModal = () => {
    setState({
      ...state,
      whatModal: true,
    });
  };
  const closeWhatModal = (id) => {
    setState({
      ...state,
      whatModal: false,
    });
  };

  //Hoda
  const generateRandomRGB = (indexcolor) => {
    var hexValues = [
      pink[300],
      purple[300],
      indigo[300],
      blue[300],
      cyan[300],
      teal[300],
      green[300],
      lime[300],
      amber[300],
      brown[300],
    ];

    return hexValues[indexcolor];
  };
  /**
   * Get Interest to show on the top of the page
   */
  const getInterests = () => {
    return RestAPI.cloudChart()
      .then((response, err) => {
        let rowArray = [];
        if (response.data) {
          //Top 5
          for (let i = 0; i < 5; i++) {
            rowArray.push({
              text: response.data[i].keyword,
              weight: response.data[i].weight,
              id: i.toString(),
              color: generateRandomRGB(i),
            });
          }
        }
        setState({
          ...state,
          isLoding: true,
          interests: rowArray,
        });
      })
      .catch((error) => {
        setState({ ...state, isLoding: false });
        handleServerErrors(error, toast.error);
      });
  };
  /**
   * Get Recommended Items
   */
  function getRecommendedPapers() {
    const { interests } = state;
    if (interests.length > 0) {
      RestAPI.extractPapersFromTags(interests)
        .then((res) => {
          setState(() => ({
            ...state,
            loading: false,
            papers: res.data.data,
            papersLoaded: true,
          }));
        })
        .catch((err) => console.error("Error Getting Papers:", err));
    }
  }

  //Hoda - Tanaz
  const getTagColorByName = (tagName) => {
    const { interests } = state;
    const color = interests.find((tag) => tag.text === tagName).color;
    return color;
  };

  //Jaleh
  const refinePapers = (papers) => {
    let res = [];
    papers.map((paper) => {
      res.push({
        paperId: paper.paperId,
        title: paper.title,
        interests_similarity: paper.interests_similarity,
        paper_keywords: paper.paper_keywords,
        score: paper.score,
      });
    });
    return res;
  };
  //Jaleh
  const refineInterests = (interests) => {
    let res = [];
    interests.map((interest, i) => {
      res.push({
        id: interest.id,
        text: interest.text,
        color: generateRandomRGB(i),
        weight: interest.weight,
      });
    });
    return res;
  };
  const { papers } = state;
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "70%",
    bgcolor: "#fff",
    border: "1px solid #ccc",
    overflow: "scroll",
    height: "100%",
    display: "block",
    p: 4,
  };
  //Tanaz
  const whatStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "70%",
    backgroundColor: "#FFFFFF",
    border: "1px solid #ccc",
    height: "70%",
    display: "block",
    p: 4,
  };
  return (
    <>
      <Grid container component={Paper} className="bg-gradient-default1 shadow">
        <Grid
          item
          md={12}
          style={{ padding: "15px" }}
          className="bg-transparent"
        >
          <Typography variant="h6">Publications Recommendation</Typography>
          {/* start Tannaz */}
          <Grid
            container
            style={{ justifyContent: "flex-end" }}
            spacing={2}
            className="d-flex align-items-center mt-3"
          >
            <Grid item md={12}>
              <fieldset className="paper-interests-box">
                <legend
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  Your interests:
                </legend>
                <Grid container>
                  <Grid item md={12}>
                    <InterestsTags tags={refineInterests(state.interests)} />
                  </Grid>
                </Grid>
                <Grid item md={1} style={{ float: "right" }}>
                  <Grid onClick={() => openWhatIfModal()}>
                    <Button variant="outlined" color="primary" size="small">
                      What-if?
                    </Button>
                  </Grid>
                  <Modal
                    open={state.modal}
                    onClose={closeWhatIfModal}
                    size="md"
                  >
                    <Paper style={style}>
                      <Grid item md={12}>
                        <DialogTitle style={{ m: 0, p: 2 }}>
                          <Seperator Label="What if?" Width="130" />
                          {state.modal ? (
                            <IconButton
                              aria-label="close"
                              onClick={closeWhatIfModal}
                              style={{
                                position: "absolute",
                                right: 8,
                                top: 8,
                              }}
                            >
                              <CloseIcon />
                            </IconButton>
                          ) : null}
                        </DialogTitle>
                      </Grid>
                      <Grid item md={12}>
                        <DialogContent>
                          <WhatIfGeneral
                            interests={refineInterests(state.interests)}
                            threshold={state.threshold}
                            items={refinePapers(papers)}
                            handleApplyGeneralChanges={
                              handleApplyGeneralChanges
                            }
                          />
                        </DialogContent>
                      </Grid>
                    </Paper>
                  </Modal>
                </Grid>
              </fieldset>
            </Grid>
          </Grid>
        </Grid>
        {/* Tanaz */}
        <div className="d-flex align-items-center ml-4 mt-2">
          <Button variant="string" onClick={() => openWhatModal()}>
            <CloudQueueIcon color="action" fontSize="small" />
            <Typography align="center" variant="subtitle2" className="ml-2">
              Interests Sources
            </Typography>
          </Button>
        </div>
        {/* What Modal */}

        <Modal
          open={state.whatModal}
          onClose={closeWhatModal}
          size="md"
          className="publication-modal"
        >
          <Box style={whatStyle}>
            <Grid item md={12} sm={12}>
              <DialogTitle style={{ m: 0, p: 2 }}>
                <Seperator Label="What the system knows?" Width="200" />
                {state.whatModal ? (
                  <IconButton
                    aria-label="close"
                    onClick={closeWhatModal}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 8,
                    }}
                  >
                    <CloseIcon />
                  </IconButton>
                ) : null}
              </DialogTitle>
            </Grid>
            <Grid item md={12} sm={12}>
              <Typography align="left" variant="subtitle2" className="ml-3">
                Your Top Interests have been chosen from this wordcloud:
              </Typography>
            </Grid>
            <Grid item md={12} sm={12}>
              <DialogContent>
                <CloudChart />
              </DialogContent>
            </Grid>
          </Box>
        </Modal>
        <Seperator Label="Publications" Width="130" />
        {/* end Tannaz */}
        <Grid container style={{ padding: "20px" }} id="paper-card-container">
          {state.loading ? (
            <Grid
              container
              spacing={0}
              direction="column"
              alignItems="center"
              justify="center"
            >
              <Grid item md={3}>
                <CircularProgress />
              </Grid>
              <Grid item md={3}>
                <Typography align="center" variant="subtitle2" className="ml-2">
                  Loading Publications.. please wait
                </Typography>
              </Grid>
            </Grid>
          ) : papers ? (
            papers.map((paper, i) => {
              if (paper.score > state.threshold) {
                return (
                  <PaperCard
                    key={paper.paperId}
                    index={paper.paperId}
                    paper={paper}
                    interests={refineInterests(state.interests)}
                    threshold={state.threshold}
                    handleApplyWhatIfChanges={handleApplyWhatIfChanges}
                  />
                );
              }
            })
          ) : (
            <Typography align="center" variant="subtitle2" className="ml-2">
              No publication Found
            </Typography>
          )}
        </Grid>
      </Grid>
      <ScrollTopWrapper />
    </>
  );
}

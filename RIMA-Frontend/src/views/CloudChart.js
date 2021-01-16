import React from "react";
import Chart from "chart.js";
import CloudChart from "../components/Chart/CloudChart";
import { Link } from "react-router-dom";

import { Card, CardHeader, CardBody, Container, Row, Col } from "reactstrap";

// core components
import { chartOptions, parseOptions } from "variables/charts.js";

import Header from "components/Headers/Header.js";
import { getItem } from "utils/localStorage";
import swal from "@sweetalert/with-react";
import "../assets/scss/custom.css";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

import {faCog} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

class CloudChartPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeNav: 1,
      chartExample1Data: "data1",
      tooltipOpen: false,
      imageTooltipOpen: false,
    };
    if (window.Chart) {
      parseOptions(Chart, chartOptions());
    }
  }

  toggleNavs = (e, index) => {
    e.preventDefault();
    this.setState({
      activeNav: index,
      chartExample1Data:
        this.state.chartExample1Data === "data1" ? "data2" : "data1",
    });
  };
  toogle = (status) => {
    this.setState({ tooltipOpen: status });
  };
  handleToogle = (status) => {
    console.log("called")
    this.setState({ imageTooltipOpen: status });
  };
  modalDetail = () => {
    swal(
      <div>
        <img
          style={{ width: "100%" }}
          src={require("../assets/img/twitter.png")}
        />
      </div>
    );
  };

  render() {
    return (
      <>
        <Header />
        {/* Page content */}
        <Container className="mt--7" fluid>
          <Row>
            <Col className="mb-5 mb-xl-0" xl="12">
              <Card className="bg-gradient-default1 shadow">
                <CardHeader className="bg-transparent">
                  <Row className="align-items-center">
                    <div className="col" style={{ display: "flex", justifyContent: "space-between" }}>

                      <div>
                        <h2 className="text-white1 mb-0">Interest Overview</h2>
                        <p> This chart shows your interests, which are extracted from your papers, tweets, or manually
                        added keywords.
                          <p className="flex">You can learn more about why/how this chart was generated by: </p>
                          <li> hovering over a keyword (basic explanation)</li>
                          <li> clicking on a keyword (intermediate explanation)</li>
                          <li> clicking
                            <span onClick={this.modalDetail}
                              style={{ marginLeft: "4px", marginRight: "4px", color: "blue", cursor: "pointer" }}>
                              here
                            </span>
                            (advanced explanation) &nbsp;
                          </li>
                          These basic, intermediate and advanced explanations refer to the amount of detail provided.
                        </p>
                      </div>

                      {getItem("mId") === getItem("userId") ? (
                        <div>
                          <Link to="/app/Keyword">
                            <OverlayTrigger
                              placement="bottom"
                              delay={{ show: 100, hide: 400 }}
                              overlay={
                                <Tooltip>
                                  If you’re not satisfied with the interest modeling
                                  results, click here to generate a better interest
                                  model yourself.
                                </Tooltip>
                              }
                            >
                            
                              <Button variant="info" > 
                              <FontAwesomeIcon icon={faCog} style={{marginRight: "8px"}}/>
                              Manage Interests 
                              </Button>
                            </OverlayTrigger>
                          </Link>
                        </div>
                      ) : (
                          <></>
                        )}
                    </div>
                  </Row>
                </CardHeader>

                <CardBody>
                  <CloudChart />
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </>
    );
  }
}

export default CloudChartPage;

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import hand_landmarker_task from "./hand_landmarker.task";
import * as React from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import './App-light.css';


const WebcamDisplay = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const scribbleCanvasRef = useRef(null);
    const [handPresence, setHandPresence] = useState(null);
    const [recordedPoints, setRecordedPoints] = useState([]);
    
    const [imageUrl, setImageUrl] = useState(null); // State to hold the image URL
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);

    const [generateBtnText, setGenerateBtnText] = useState("Generate");
    const [prompt, setPrompt] = useState("bus");
    const [additionalPrompt, setAdditionalPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");

    const [valueFirstTab, setValueFirstTab] = React.useState('1');
    const [valueSecondTab, setValueSecondTab] = React.useState('1');

    const [numberOfImages, setNumberOfImages] = React.useState(30);
    const [imageResolution, setImageResolution] = React.useState(30);
    const [numberOfSteps, setNumberOfSteps] = React.useState(30);
    const [guidanceScale, setGuidanceScale] = React.useState(30);
    const [seed, setSeed] = React.useState(30);

    const [show, setShow] = useState(false);

    const handleChangeFirstTab = (event, newValue) => {
        setValueFirstTab(newValue);
    };

    const handleChangeSecondTab = (event, newValue) => {
        setValueSecondTab(newValue);
    };

    const handleChangeNumberOfImages = (event, newValue) => {
        setNumberOfImages(newValue);
    };

    const handleChangeImageResolution = (event, newValue) => {
        setImageResolution(newValue);
    };

    const handleChangeNumberOfSteps = (event, newValue) => {
        setNumberOfSteps(newValue);
    };

    const handleChangeGuidanceScale = (event, newValue) => {
        setGuidanceScale(newValue);
    };

    const handleChangeSeed = (event, newValue) => {
        setSeed(newValue);
    };
    
    useEffect(() => {
        let handLandmarker;
        let animationFrameId;

        const initializeHandDetection = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
                );
                handLandmarker = await HandLandmarker.createFromOptions(
                    vision, {
                        baseOptions: { modelAssetPath: hand_landmarker_task },
                        numHands: 2,
                        runningMode: "video"
                    }
                );
                detectHands();
            } catch (error) {
                console.error("Error initializing hand detection:", error);
            }
        };

        const drawLandmarks = (landmarksArray) => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';

            landmarksArray.forEach(landmarks => {
                landmarks.forEach(landmark => {
                    const x = landmark.x * canvas.width;
                    const y = landmark.y * canvas.height;

                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI); // Draw a circle for each landmark
                    ctx.fill();
                });
            });
        };

        const recordPoint = (handdnessArray, landmarksArray) => {
            //console.log(handdnessArray);
            // Find the index of the right hand and record the landmark at index 8 (tip of the index finger)
            let rightHandIndex = -1;
            handdnessArray.forEach((handedness, hand_idx) => {
                if (handedness[0].categoryName == "Right") {
                    rightHandIndex = hand_idx;
                }
            });
            //console.log(rightHandIndex);
            if (rightHandIndex > -1) {
                const rightHandLandmark8 = landmarksArray[rightHandIndex][8];
                // append the recorded point to the recordedPoints array
                setRecordedPoints(recordedPoints => [...recordedPoints, rightHandLandmark8]);
            }   
        };

        const detectHands = () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                const detections = handLandmarker.detectForVideo(videoRef.current, performance.now());
                setHandPresence(detections.handednesses.length > 0);

                // Assuming detections.landmarks is an array of landmark objects
                if (detections.landmarks) {
                    drawLandmarks(detections.landmarks);
                    recordPoint(detections.handednesses, detections.landmarks);
                }
            }
            requestAnimationFrame(detectHands);
        };

        const startWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoRef.current.srcObject = stream;
                // make the video and canvas the same size as the video stream
                const w = stream.getVideoTracks()[0].getSettings().width;
                const h = stream.getVideoTracks()[0].getSettings().height;
                videoRef.current.width = w;
                videoRef.current.height = h;
                canvasRef.current.width = w;
                canvasRef.current.height = h;
                scribbleCanvasRef.current.width = w;
                scribbleCanvasRef.current.height = h;
                await initializeHandDetection();
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        };

        startWebcam();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (handLandmarker) {
                handLandmarker.close();
            }
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, []);

    const drawScribble = (pointsArray) => {
        const canvas = scribbleCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;
        ctx.beginPath();

        let firstPoint = true;  // Flag to indicate if this is the first point in the array
        //console.log(pointsArray);
        pointsArray.forEach(landmark => {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            };
        });
        
        ctx.stroke();
    };

    const saveScribble = () =>{
        var canvas = scribbleCanvasRef.current;
        var dataURL = canvas.toDataURL("image/png");
        //var newTab = window.open('about:blank','image from canvas');
        //newTab.document.write("<img src='" + dataURL + "' alt='from canvas'/>");
        setImageUrl(dataURL);
        console.log(dataURL)
    };

    useEffect(() => {
        // This effect will run whenever recordedPoints state changes
        if (recordedPoints.length > 0) {
            drawScribble(recordedPoints);
        }
    }, [recordedPoints]);

    const generateImage = () => {
        setGenerateBtnText('Generating...');
        var canvas = scribbleCanvasRef.current;
        const scrible = canvas.toDataURL("image/png");
        callImageGenAPI(scrible);
      };

    const callImageGenAPI = async(scrible) => {
        console.log('callImageGenAPI');
        // Define the data to be sent to the API
        const requestData = {
            image_base64: scrible,
            prompt: prompt,
            additional_prompt: additionalPrompt,
            negative_prompt: negativePrompt,
            num_images: numberOfImages,
            image_resolution: imageResolution,
            preprocess_resolution: 512,
            num_steps: numberOfSteps,
            guidance_scale: guidanceScale,
            seed: seed
        };
        
        // Make a POST request to the API endpoint
        fetch('https://7137-34-106-208-205.ngrok-free.app/process_scribble_base64/', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            // Check if the response is successful
            if (!response.ok) {
                setGenerateBtnText("Generate");
            throw new Error('Network response was not ok');
            }
            // Parse the JSON response
            return response.json();
        })
        .then(data => {
            // Handle the response data
            console.log('Response from API:', data);
            console.log('base64Image from API:', data.base64Image);
            // Set the imageUrl state with the base64 image data from the API response
            setGeneratedImageUrl(data.base64Image); // Assuming the API response contains a field named 'base64Image'
            setGenerateBtnText("Generate");
        })
        .catch(error => {
            // Handle errors
            console.error('There was a problem with the fetch operation:', error);
        });
    };

    return (
    <Box>
      <Grid container spacing={2} sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
        <Grid item  md={6} sx={{display: 'block', backgroundColor: '#00000', width: 500, height: 500, padding: 2}}>
            <label>Image generation with diffuse models.</label>

            <Box sx={{ width: '100%', typography: 'body1', marginTop: 4 }}>
                <TabContext value={valueFirstTab}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabList onChange={handleChangeFirstTab} aria-label="lab API tabs example">
                            <Tab label="Drawing" value="1" />
                            <Tab label="Generated Images" value="2" />
                        </TabList>
                    </Box>
                    <TabPanel value="1">
                        <div style={{ position: "relative" }}>
                            <video className='video'
                            ref={videoRef}
                            width="640"
                            height="480"
                            autoPlay
                            playsInline
                            muted // Mute the video to avoid feedback noise
                            ></video>
                            <canvas className='video'
                                ref={canvasRef}
                                width="640"
                                height="480"
                                style={{ position: "absolute", top: 0, left: 0 }}
                            ></canvas>
                            <canvas className='video'
                                ref={scribbleCanvasRef}
                                width="640"
                                height="480"
                                style={{ position: "absolute", top: 0, left: 0 }}
                            ></canvas>
                        </div>
                    </TabPanel>
                    <TabPanel value="2">
                        {/*<p className='small'>Recorded Points: {JSON.stringify(recordedPoints)}</p>*/}
                        <Box sx={{ display: 'grid'}}>
                            {imageUrl && <img className='video' src={imageUrl} alt="Scribble Image" style={{backgroundColor: 'white'}}/>} {/* Display the image if imageUrl is not null */}
                            {generatedImageUrl && <img className='video' src={generatedImageUrl} alt="Generated Image" />}
                        </Box>
                    </TabPanel>
                </TabContext>
            </Box>
        </Grid>
        <Grid item md={6} sx={{display: 'block', backgroundColor: '#ffffff', width: 500, height: 500, padding: 2, marginTop: 6   }}>
            <Box sx={{ width: '100%', typography: 'body1' }}>
                <TabContext value={valueSecondTab}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <TabList onChange={handleChangeSecondTab} aria-label="lab API tabs example">
                            <Tab label="Prompt settings" value="1" />
                            <Tab label="Other settings" value="2" />
                        </TabList>
                    </Box>
                    <TabPanel value="1">
                        <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '13px', padding: 1, marginBottom: 2}}>
                            {/*<Typography variant="h2" color="#000000">Prompt:</Typography>*/}
                            <label htmlFor="prompt">Prompt</label>
                            <input className="textbox" type="text" id="prompt" name="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}/><br/>
                        </Box>
                        <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '13px', padding: 1}}>
                            <Box sx={{ display: 'flex', alidnItems: 'center', cursor: 'pointer'}} onClick={() => setShow(prev => !prev)}>
                                <label htmlFor="prompt">Open for more prompt</label>
                                {show ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />}
                            </Box>
                            {show && (
                                <>
                                    <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '13px 13px 0px 0px', padding: 1, width: 650, marginTop: 1}}>
                                        <label htmlFor="prompt">Additional prompt</label>
                                        <input className="textbox" type="text" id="prompt" name="prompt" value={additionalPrompt} onChange={(e) => setAdditionalPrompt(e.target.value)}/><br/>
                                    </Box>
                                    <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '0px 0px 13px 13px', padding: 1}}>
                                        <label htmlFor="prompt">Negative prompt</label>
                                        <input className="textbox" type="text" id="prompt" name="prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}/><br/>
                                    </Box>
                                </>
                            )}
                        </Box>
                    </TabPanel>
                    <TabPanel value="2">
                        <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '0px 0px 13px 13px', padding: 1, width: 650}}>
                            <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '13px 13px 0px 0px', width: 610, padding: 2}}>
                                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                    <label htmlFor="prompt">Number of images</label>
                                    <input className="textbox" type="text" id="prompt" name="prompt" value={numberOfImages} onChange={(e) => handleChangeNumberOfImages(e.target.value)}/><br/>
                                </Box>
                                <Slider aria-label="Volume" value={numberOfImages} onChange={handleChangeNumberOfImages} />
                            </Box>
                            <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '0px', width: 610, padding: 2}}>
                                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                    <label htmlFor="prompt">Image resolution</label>
                                    <input className="textbox" type="text" id="prompt" name="prompt" value={imageResolution} onChange={(e) => handleChangeImageResolution(e.target.value)}/><br/>
                                </Box>
                                <Slider aria-label="Volume" value={imageResolution} max={768} onChange={handleChangeImageResolution} />
                            </Box>
                            <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '0px', width: 610, padding: 2}}>
                                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                    <label htmlFor="prompt">Number of steps</label>
                                    <input className="textbox" type="text" id="prompt" name="prompt" value={numberOfSteps} onChange={(e) => handleChangeNumberOfSteps(e.target.value)}/><br/>
                                </Box>
                                <Slider aria-label="Volume" value={numberOfSteps} onChange={handleChangeNumberOfSteps} />
                            </Box>
                            <Box sx={{ display: "grid", justifyContent: 'left', border: '1px solid grey', borderRadius: '0px', width: 610, padding: 2}}>
                                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                    <label htmlFor="prompt">Guidance scale</label>
                                    <input className="textbox" type="text" id="prompt" name="prompt" value={guidanceScale} onChange={(e) => handleChangeGuidanceScale(e.target.value)}/><br/>
                                </Box>
                                <Slider aria-label="Volume" value={guidanceScale} onChange={handleChangeGuidanceScale} />
                            </Box>
                            <Box sx={{ display: "grid",justifyContent: 'left', border: '1px solid grey', borderRadius: '0px', width: 610, padding: 2}}>
                                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                    <label htmlFor="prompt">Seed</label>
                                    <input className="textbox" type="text" id="prompt" name="prompt" value={seed} onChange={(e) => handleChangeSeed(e.target.value)}/><br/>
                                </Box>
                                <Slider aria-label="Volume" value={seed} onChange={handleChangeSeed} />
                            </Box>
                            <Box sx={{ display: "flex", alignItems: 'center', justifyContent: 'left', border: '1px solid grey', borderRadius: '0px 0px 13px 13px', width: 610, padding: 2}}>
                                <Checkbox label="Randomize seed" defaultChecked />
                                <label htmlFor="prompt">Randomize seed</label>
                            </Box>
                        </Box>
                    </TabPanel>
                </TabContext>
                <Box>
                    <Box sx={{ display: 'flex', justifyContent: "center"}}>
                        <Button variant="contained" style={{ backgroundColor: '#808080', marginRight: 10, width: 400, padding: 10 }} onClick={() => {setRecordedPoints([]); drawScribble([])}}>Clear</Button>
                        <Button variant="contained" style={{ backgroundColor: '#808080', width: 400, padding: 10 }} onClick={() => saveScribble()}>Save</Button>
                    </Box>
                    <Box>
                        <Button variant="contained" style={{ backgroundColor: '#808080', width: '100%', marginTop: 10, padding: 10 }} onClick={generateImage}>{generateBtnText}</Button>
                    </Box>
                </Box>
            </Box>
        </Grid>
      </Grid>
      </Box>
    );
};

export default WebcamDisplay;
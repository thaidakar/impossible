import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import { Suite } from "../Logic/Deck";
import { useColorMode } from "@chakra-ui/react";

interface ConfettiProps {
    onComplete: () => void;
    gamesWon: number;
}

export const Confetti = (props: ConfettiProps) => {

    const { onComplete, gamesWon } = props;

    const [windowDimension, setDimension] = useState({width: window.innerWidth, height: window.innerHeight});
    const { colorMode } = useColorMode();

    const detectSize = () => {
        setDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    useEffect(() => {
        window.addEventListener('resize', detectSize);

        return () => window.removeEventListener('resize', detectSize);
    });

    return (
        <>
            <ReactConfetti 
                width={windowDimension.width}
                height={windowDimension.height}
                tweenDuration={5000}
                numberOfPieces={400 + 10 * gamesWon}
                colors={['#f44336','#e91e63','#9c27b0','#673ab7']}
                recycle={false}
                onConfettiComplete={onComplete}
                drawShape={ctx => {
                    const scale = 3;
                    ctx.scale(scale, scale);
                    let suite = Suite.Spade;
                    switch (ctx.fillStyle) {
                        case '#f44336':
                            suite = Suite.Club;
                            break;
                        case '#e91e63':
                            suite = Suite.Diamond;
                            break;
                        case '#9c27b0':
                            suite = Suite.Heart;
                            break;
                        case '#673ab7':
                            suite = Suite.Spade;
                            break;
                    }
                    ctx.fillStyle = suite == Suite.Diamond || suite == Suite.Heart ? '#DB1424' : colorMode === 'dark' ? 'white' : 'black';
                    ctx.fillText(suite, 0, 0);
                }}
            />
        </>
    );
}
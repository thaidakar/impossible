import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

interface ConfettiProps {
    onComplete: () => void;
    gamesWon: number;
}

export const Confetti = (props: ConfettiProps) => {

    const { onComplete, gamesWon } = props;

    const [windowDimension, setDimension] = useState({width: window.innerWidth, height: window.innerHeight});

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
                numberOfPieces={200 + 10 * gamesWon}
                recycle={false}
                onConfettiComplete={onComplete}
            />
        </>
    );
}
import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

interface ConfettiProps {
    onComplete: () => void;
}

export const Confetti = (props: ConfettiProps) => {

    const { onComplete } = props;

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
                tweenDuration={1000}
                numberOfPieces={200}
                recycle={false}
                onConfettiComplete={onComplete}
            />
        </>
    );
}
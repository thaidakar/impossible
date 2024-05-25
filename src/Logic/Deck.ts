import { useState } from "react";

export enum Suite {
    Spade = '♠',
    Heart = '♥',
    Club = '♣',
    Diamond = '♦',
}

export enum CardVal {
    Two = '2',
    Three = '3',
    Four = '4',
    Five = '5',
    Six = '6',
    Seven = '7',
    Eight = '8',
    Nine = '9',
    Ten = '10',
    Jack = '11',
    Queen = '12',
    King = '13',
    Ace = '14'
}

export function displayName(cardVal: CardVal) {
    switch (cardVal) {
        case CardVal.Two: 
        case CardVal.Three:
        case CardVal.Four:
        case CardVal.Five:
        case CardVal.Six:
        case CardVal.Seven:
        case CardVal.Eight:
        case CardVal.Nine:
        case CardVal.Ten:
            return +cardVal;
        case CardVal.Jack:
            return 'J';
        case CardVal.Queen:
            return 'Q';
        case CardVal.King:
            return 'K';
        case CardVal.Ace:
            return 'A';
    }
}

export interface Card {
    suite: Suite;
    val: CardVal;
    hidden?: boolean;
}

export const suiteValues = Object.values(Suite) as Suite[];
export const cardValues = Object.values(CardVal) as CardVal[];

export function GetNextCard(deck: Card[]) {

    if (deck.length === 0) {
        console.log("Deck is empty.")
        return {idx: undefined, card: undefined};
    }

    let card: Card;
    let idx: number;

    while (true) {
        const suite = suiteValues[Math.floor(Math.random() * suiteValues.length)];
        const value = cardValues[Math.floor(Math.random() * cardValues.length)];

        card = {suite: suite, val: value} as Card;

        idx = deck.findIndex(c => c.suite === suite && c.val === value);

        if (idx === -1) {
            continue;
        }
        else {
            break;
        }
    }

    return {idx, card};
}
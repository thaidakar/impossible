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

export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function GetNextCard(deck: Card[]) {
    if (deck.length === 0) {
        return {idx: undefined, card: undefined};
    }

    return {idx: 0, card: deck[0]};
}

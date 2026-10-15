import { languageName, type Card, type StudyDirection } from '@lexbrain/core';
import { Highlighted } from './Highlighted';
import { canSpeak, speak } from './speak';

interface Props {
  card: Card;
  flipped: boolean;
  direction: StudyDirection;
}

function Face({
  card,
  side,
  className,
}: {
  card: Card;
  side: 'source' | 'target';
  className: string;
}) {
  const isSource = side === 'source';
  const text = isSource ? card.sourceText : card.translatedText;
  const lang = isSource ? card.sourceLang : card.targetLang;
  return (
    <div className={`face ${className} kind-${card.kind} ${isSource ? 'face-source' : 'face-target'}`} aria-hidden={undefined}>
      <div className="face-head">
        <span className="face-lang">{languageName(lang)}</span>
        {canSpeak && (
          <button
            type="button"
            className="link-btn"
            aria-label={`Listen to ${isSource ? 'original' : 'translation'}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              speak(text, lang);
            }}
          >
            Listen
          </button>
        )}
      </div>
      <div className="face-body">
        <p className="face-text">{isSource && card.kind === 'word' ? <mark className="marker">{text}</mark> : text}</p>
        {isSource && card.contextSentence && (
          <p className="face-context">
            <Highlighted text={card.contextSentence} term={card.sourceText} />
          </p>
        )}
        {!isSource && card.note && <p className="face-note">{card.note}</p>}
      </div>
    </div>
  );
}

export function FlipCard({ card, flipped, direction }: Props) {
  const frontSide = direction === 'source-to-target' ? 'source' : 'target';
  const backSide = frontSide === 'source' ? 'target' : 'source';
  return (
    <div className={`flip ${flipped ? 'is-flipped' : ''}`}>
      <Face card={card} side={frontSide} className="face-front" />
      <Face card={card} side={backSide} className="face-back" />
    </div>
  );
}

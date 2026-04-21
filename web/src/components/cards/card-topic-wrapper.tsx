"use client";

import { useEffect, useState } from "react";
import { FloatingCardExperience } from "./floating-card-experience";

interface CardTopic {
  id: string;
  label: string;
  cards: {
    id: string;
    title: string;
    imageUrl: string;
    backImageUrl: string;
    phaseOffset: number;
  }[];
}

interface CardTopicWrapperProps {
  topics: CardTopic[];
}

export function CardTopicWrapper({ topics }: CardTopicWrapperProps) {
  const [activeTopicId, setActiveTopicId] = useState(topics[0].id);

  useEffect(() => {
    function onTopicChange() {
      const topic = document.documentElement.getAttribute("data-card-topic");
      if (topic && topics.some((t) => t.id === topic)) {
        setActiveTopicId(topic);
      }
    }
    
    // Check initial state
    onTopicChange();

    const observer = new MutationObserver(onTopicChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-card-topic"] });

    return () => {
      observer.disconnect();
    };
  }, [topics]);

  const activeTopic = topics.find((t) => t.id === activeTopicId) || topics[0];

  return (
    <div className="relative">
      <FloatingCardExperience cards={activeTopic.cards} />
    </div>
  );
}

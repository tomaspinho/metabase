/* eslint-disable react/prop-types */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { t } from "ttag";
import cx from "classnames";
import { getIn } from "icepick";
import { AutoSizer, List } from "react-virtualized";

import LoadingAndErrorWrapper from "metabase/components/LoadingAndErrorWrapper";
import Icon from "metabase/components/Icon";
import Tooltip from "metabase/components/Tooltip";
import CheckBox from "metabase/components/CheckBox";

import MetabaseAnalytics from "metabase/lib/analytics";
import { color } from "metabase/lib/colors";

import { LoadMoreButton, LoadMoreRow } from "./QuestionList.styled";

const CHUNK_SIZE = 15;

const isQuestionCompatible = (
  visualization,
  dashcard,
  dashcardData,
  question,
) => {
  const initialSeries = {
    card: dashcard.card,
    data: getIn(dashcardData, [dashcard.id, dashcard.card.id, "data"]),
  };

  try {
    if (question.id() === dashcard.card.id) {
      return false;
    }

    if (question.isStructured()) {
      if (
        !visualization.seriesAreCompatible(initialSeries, {
          card: question.card(),
          data: { cols: question.query().columns(), rows: [] },
        })
      ) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const QuestionList = React.memo(function QuestionList({
  questions,
  badQuestions,
  enabledQuestions,
  error,
  onSelect,
  dashcard,
  dashcardData,
  loadMetadataForQueries,
  visualization,
  isLoadingMetadata,
}) {
  const [searchText, setSearchText] = useState("");

  const handleSearchFocus = () => {
    MetabaseAnalytics.trackEvent("Dashboard", "Edit Series Modal", "search");
  };

  const filteredQuestions = useMemo(() => {
    const filterText = searchText.toLowerCase();
    const filteredQuestions = questions.filter(question =>
      question
        .displayName()
        .toLowerCase()
        .includes(filterText),
    );

    filteredQuestions.sort((a, b) => {
      if (!a.isNative()) {
        return 1;
      } else if (!b.isNative()) {
        return -1;
      } else {
        return 0;
      }
    });

    return filteredQuestions;
  }, [questions, searchText]);

  const compatibleQuestions = useMemo(
    () =>
      filteredQuestions?.filter(question =>
        isQuestionCompatible(visualization, dashcard, dashcardData, question),
      ),
    [dashcard, dashcardData, filteredQuestions, visualization],
  );

  const questionsWithoutMetadata = useMemo(
    () =>
      filteredQuestions.filter(
        question => question.isStructured() && !question.query().hasMetadata(),
      ),
    [filteredQuestions],
  );

  const handleLoadNext = useCallback(async () => {
    if (questionsWithoutMetadata.length === 0) {
      return;
    }

    const questionsChunk = questionsWithoutMetadata.slice(0, CHUNK_SIZE);

    await loadMetadataForQueries(
      questionsChunk.map(question => question.query()),
    );
  }, [loadMetadataForQueries, questionsWithoutMetadata]);

  useEffect(() => {
    handleLoadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredQuestions.length]);

  const canLoadMore = questionsWithoutMetadata.length > 0;
  const rowsCount = canLoadMore
    ? compatibleQuestions.length + 1
    : compatibleQuestions.length;

  return (
    <>
      <div
        className="flex-no-shrink border-bottom flex flex-row align-center"
        style={{ borderColor: color("border") }}
      >
        <Icon className="ml2" name="search" size={16} />
        <input
          className="h4 input full pl1"
          style={{ border: "none", backgroundColor: "transparent" }}
          type="search"
          placeholder={t`Search for a question`}
          onFocus={handleSearchFocus}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>
      <LoadingAndErrorWrapper
        className="flex flex-full overflow-auto"
        loading={!filteredQuestions}
        error={error}
        noBackground
      >
        {() => (
          <>
            <div className="pr1 pb2 w-full">
              <AutoSizer>
                {({ width, height }) => (
                  <List
                    overscanRowCount={0}
                    width={width}
                    height={height}
                    rowCount={rowsCount}
                    rowHeight={36}
                    rowRenderer={({ index, key, style }) => {
                      const isLoadMoreRow =
                        index === compatibleQuestions.length;

                      if (isLoadMoreRow) {
                        return (
                          <LoadMoreRow style={style}>
                            <LoadMoreButton
                              onClick={handleLoadNext}
                              disabled={isLoadingMetadata}
                            >
                              {isLoadingMetadata ? t`Loading` : t`Load more`}
                            </LoadMoreButton>
                          </LoadMoreRow>
                        );
                      }

                      const question = compatibleQuestions[index];
                      const isEnabled = enabledQuestions[question.id()];
                      const isBad = badQuestions[question.id()];

                      return (
                        <QuestionListItem
                          key={key}
                          question={question}
                          isEnabled={isEnabled}
                          isBad={isBad}
                          style={style}
                          onChange={e => onSelect(question, e.target.checked)}
                        />
                      );
                    }}
                  />
                )}
              </AutoSizer>
            </div>
          </>
        )}
      </LoadingAndErrorWrapper>
    </>
  );
});

const QuestionListItem = React.memo(function QuestionListItem({
  question,
  onChange,
  isEnabled,
  isBad,
  style,
}) {
  return (
    <li
      style={style}
      className={cx("my1 pl2 py1 flex align-center", {
        disabled: isBad,
      })}
    >
      <span className="px1 flex-no-shrink">
        <CheckBox
          label={question.displayName()}
          checked={isEnabled}
          onChange={onChange}
        />
      </span>
      {!question.isStructured() && (
        <Tooltip tooltip={t`We're not sure if this question is compatible`}>
          <Icon
            className="px1 flex-align-right text-light text-medium-hover cursor-pointer flex-no-shrink"
            name="warning"
            size={20}
          />
        </Tooltip>
      )}
    </li>
  );
});

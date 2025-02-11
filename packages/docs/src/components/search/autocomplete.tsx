import * as React from 'react';
import { createPortal } from 'react-dom';
import cn from 'classnames';
import { browserName } from 'react-device-detect';
import { useRouter } from 'next/router';
import {
  NextUIThemes,
  useTheme,
  useBodyScroll,
  useClickAway,
  usePortal,
} from '@nextui-org/react';
import AutoSuggest, {
  ChangeEvent,
  OnSuggestionSelected,
  RenderSuggestionsContainerParams,
  RenderInputComponentProps,
} from 'react-autosuggest';
import { useMediaQuery } from '@hooks/use-media-query';
import { SearchByAlgolia, Search, Close } from '../icons';
import { addColorAlpha } from '@utils/index';
import {
  connectAutoComplete,
  connectStateResults,
} from 'react-instantsearch-dom';
import { isEmpty, includes } from 'lodash';
import { AutocompleteProvided } from 'react-instantsearch-core';
import Suggestion from './suggestion';

interface Props extends AutocompleteProvided {}

const isSafari = includes(browserName, 'Safari');

const Autocomplete: React.FC<Props> = ({ hits, refine }) => {
  const [value, setValue] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);
  const [, setBodyHidden] = useBodyScroll(null, { scrollLayer: true });
  const router = useRouter();
  const suggestionsPortal = usePortal('suggestions');
  const noResultsPortal = usePortal('no-results');
  const theme = useTheme() as NextUIThemes;
  const isMobile = useMediaQuery(
    Number(theme.breakpoints.sm.max.replace('px', ''))
  );

  let inputRef = React.useRef<HTMLInputElement>(null);

  useClickAway(inputRef, () => {
    setIsFocused(false);
    inputRef && inputRef?.current?.blur();
  });

  React.useEffect(() => {
    if (isMobile) {
      const isOpen = !isEmpty(
        document.getElementsByClassName(
          'react-autosuggest__suggestions-container--open'
        )
      );
      const noResults = isEmpty(hits) && !isEmpty(value);
      setBodyHidden(isFocused && (isOpen || noResults));
    } else {
      setBodyHidden(false);
    }
  }, [hits, value, isFocused, isMobile]);

  const onChange = (_: unknown, { newValue }: ChangeEvent) => {
    setValue(newValue);
  };

  const inputProps = {
    value,
    onChange,
    ref: inputRef,
    type: 'search',
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };

  const onSuggestionsFetchRequested = ({ value }: any) => {
    refine(value);
  };

  const onSuggestionSelected: OnSuggestionSelected<any> = (
    _,
    { suggestion, method }
  ) => {
    if (method === 'enter') {
      onClear();
      router.push(suggestion.url);
    }
  };

  const getSuggestionValue = () => value;

  const renderSuggestion = (
    hit: any,
    { isHighlighted }: { isHighlighted: boolean }
  ) => <Suggestion highlighted={isHighlighted} hit={hit} />;

  const onClear = () => {
    refine();
    setValue('');
    inputRef && inputRef?.current?.blur();
  };

  const renderInput = React.useCallback(
    (inputProps: RenderInputComponentProps) => {
      return (
        <label className="search__input-container">
          <input {...inputProps} />
          {!value ? (
            <span className="search__placeholder-container">
              <Search
                size={16}
                fill={theme.palette.accents_8}
                className="search__placeholder-icon"
              />
              <p className="search__placeholder-text">Search...</p>
            </span>
          ) : (
            <span className="search__reset-container" onClick={onClear}>
              <Close size={16} fill={theme.palette.accents_6} />
            </span>
          )}
        </label>
      );
    },
    [value]
  );
  const renderSuggestionsContainer = ({
    containerProps,
    children,
  }: RenderSuggestionsContainerParams) =>
    isMobile && suggestionsPortal ? (
      createPortal(
        <div {...containerProps}>
          <a
            href="https://www.algolia.com/"
            target="_blank"
            rel="noreferrer"
            className="react-autosuggest__suggestions-header"
          >
            <SearchByAlgolia fill={theme.palette.accents_6} />
          </a>
          {children}
        </div>,
        suggestionsPortal
      )
    ) : (
      <div {...containerProps}>
        <a
          href="https://www.algolia.com/"
          target="_blank"
          rel="noreferrer"
          className="react-autosuggest__suggestions-header"
        >
          <SearchByAlgolia fill={theme.palette.accents_6} />
        </a>
        {children}
      </div>
    );

  const NoResults = connectStateResults(
    ({ searchState, searchResults, searching }) => {
      const open =
        searchState &&
        searchState.query &&
        !searching &&
        searchResults &&
        searchResults.nbHits === 0;
      const NoResultsContainer = () => (
        <div className="no-results">
          <span>
            No results for <span>"{value}"</span>
          </span>
          <br />
          <span>Try again with a different keyword</span>
        </div>
      );
      if (isMobile && open) {
        if (!noResultsPortal) return null;
        return createPortal(<NoResultsContainer />, noResultsPortal);
      }
      return open ? <NoResultsContainer /> : null;
    }
  );

  return (
    <div
      className={cn('search__container', {
        focused: isFocused,
        'has-value': !!value.length,
      })}
    >
      <AutoSuggest
        highlightFirstSuggestion={true}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onClear}
        onSuggestionSelected={onSuggestionSelected}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={renderSuggestion}
        renderInputComponent={renderInput}
        renderSuggestionsContainer={renderSuggestionsContainer}
        suggestions={hits}
        inputProps={inputProps}
      />

      <NoResults />

      <style jsx global>
        {`
          .search__container {
            display: flex;
            align-items: center;
            justify-content: flex-start;
          }
          .search__reset-container {
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 6;
            height: 100%;
            right: 5%;
            cursor: pointer;
            transition: all 0.25s ease;
          }
          .search__placeholder-container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
          }
          :global(.search__reset-container:hover path) {
            fill: ${addColorAlpha(theme.palette.accents_6, 0.8)};
          }
          .search__placeholder-text {
            position: absolute;
            margin: 0;
            padding: 0;
            left: 40%;
            font-size: 1rem;
            justify-content: center;
            align-items: center;
            line-height: 1px;
            pointer-events: none;
            color: ${theme.palette.accents_5};
            transition: all 0.25s ease;
          }
          .search__placeholder-icon {
            position: absolute;
            left: 30%;
            z-index: -1;
            transition: all 0.25s ease;
          }
          .search__container.focused .search__placeholder-text {
            left: ${isSafari ? '25px' : '16px'};
          }
          .search__container.focused .search__placeholder-icon {
            left: 0;
            opacity: 0;
          }
          .search__container:hover .search__placeholder-text {
            color: ${theme.palette.accents_6};
          }
          .react-autosuggest__container {
            position: relative;
            z-index: 4;
          }
          .search__input-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            background: ${addColorAlpha(theme.palette.background, 0.7)};
            box-shadow: 0px 5px 20px -5px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
          .react-autosuggest__input {
            text-align: left;
            background: none;
            color: ${theme.palette.text};
            width: 228px;
            height: 28px;
            padding: 16px;
            padding-right: calc(5% + 18px);
            font-size: 1rem;
            outline: none;
            border: none;
          }
          .react-autosuggest__suggestions-container {
            display: none;
            opacity: 0;
          }
          .react-autosuggest__suggestions-container,
          .no-results {
            position: ${isMobile ? 'fixed' : 'absolute'};
            top: 34px;
            right: 0;
            height: 0;
            padding: 12px 0;
            overflow-y: auto;
            height: auto;
            width: 428px;
            max-height: calc(100vh - 334px);
            min-height: 168px;
            transition: all 0.25s ease;
            backdrop-filter: saturate(180%) blur(20px);
            background: ${addColorAlpha(theme.palette.accents_1, 0.7)};
            box-shadow: 0px 5px 20px -5px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
          }
          @supports (
            (-webkit-backdrop-filter: blur(10px)) or
              (backdrop-filter: blur(10px))
          ) {
            .search__input-container,
            .react-autosuggest__suggestions-container,
            .no-results {
              backdrop-filter: saturate(180%) blur(10px);
              background: ${addColorAlpha(theme.palette.accents_2, 0.7)};
            }
            .search__input-container {
              background: ${addColorAlpha(theme.palette.accents_2, 0.7)};
            }
            .react-autosuggest__suggestions-container,
            .no-results {
              background: ${addColorAlpha(theme.palette.accents_1, 0.7)};
            }
          }
          @supports (
            not (-webkit-backdrop-filter: blur(10px)) and not
              (backdrop-filter: blur(10px))
          ) {
            .search__input-container {
              background: ${theme.palette.accents_2};
            }

            .react-autosuggest__suggestions-container,
            .no-results {
              background: ${theme.palette.accents_1};
            }
          }
          .react-autosuggest__suggestions-container::-webkit-scrollbar {
            width: 0px;
          }
          .react-autosuggest__suggestions-header {
            padding: 14px;
            width: 100%;
          }
          .react-autosuggest__suggestions-container--open {
            display: block;
            opacity: 1;
            z-index: 1001;
          }
          .react-autosuggest__suggestions-list {
            margin: 0;
            padding: 10px;
            list-style: none !important;
            list-style-type: none !important;
            overflow-y: auto;
          }
          .react-autosuggest__suggestions-list li:last-child a {
            border-bottom: none;
          }
          .react-autosuggest__section-container--first {
            border-top: 0;
          }
          .react-autosuggest__section-title {
            padding: 10px 0 0 10px;
            font-size: 12px;
            color: ${theme.palette.accents_6};
          }
          .no-results {
            z-index: 1001;
            display: flex;
            top: 60px;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: ${theme.palette.accents_6};
          }
          .no-results span {
            word-break: break-all;
          }
          ::-webkit-search-cancel-button {
            display: none;
          }
          @media only screen and (max-width: ${theme.breakpoints.xs.max}) {
            .react-autosuggest__suggestions-container,
            .no-results {
              z-index: 1004;
              width: 100%;
              height: calc(100vh + 10%);
              max-height: 100vh;
              padding: 0;
              border-radius: 0;
              top: 0;
              left: 0;
              right: 0;
            }
            .react-autosuggest__suggestions-container {
              padding: 64px 0;
            }
            .react-autosuggest__input {
              width: 64vw;
              padding-right: 0;
            }
            .react-autosuggest__container {
              position: initial;
              z-index: 4;
            }
            .search__placeholder-container {
              position: absolute;
              z-index: -1;
              left: 0;
              right: 0;
            }
          }
          @media only screen and (min-width: ${theme.breakpoints.xs
              .max}) and (max-width: ${theme.breakpoints.md.min}) {
            .react-autosuggest__suggestions-container,
            .no-results {
              top: 60px;
              right: 180px;
            }
            .react-autosuggest__input {
              width: 248px;
              padding-right: 0;
            }
          }
        `}
      </style>
    </div>
  );
};

const MemoAutocomplete = React.memo(Autocomplete);

export default connectAutoComplete(MemoAutocomplete);

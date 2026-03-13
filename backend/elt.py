"""
elt.py — Extract, Load, Transform pipeline for Rotten Tomatoes movie reviews.
Downloads the dataset, filters for Netflix movies, cleans review text,
and deduplicates.
"""

import html
import os

import kagglehub
import pandas as pd


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Download and return (movies, reviews) DataFrames from Kaggle."""
    try:
        path = kagglehub.dataset_download(
            'andrezaza/clapper-massive-rotten-tomatoes-movies-and-reviews'
        )
        df_movies = pd.read_csv(os.path.join(path, 'rotten_tomatoes_movies.csv'))
        df_reviews = pd.read_csv(os.path.join(path, 'rotten_tomatoes_movie_reviews.csv'))
        return df_movies, df_reviews
    except Exception as e:
        raise RuntimeError(f'Failed to load dataset: {e}')


def transform(
    df_movies: pd.DataFrame,
    df_reviews: pd.DataFrame,
    min_reviews: int = 100,
) -> pd.DataFrame:
    """
    Filter for Netflix-distributed movies, clean review text, deduplicate,
    and return a merged DataFrame ready for sentiment extraction.
    """
    # --- Filter for Netflix-distributed movies ---
    df_netflix = df_movies[
        df_movies['distributor'].str.contains('Netflix', case=False, na=False)
    ][['id', 'title', 'releaseDateStreaming', 'distributor']]

    netflix_ids = set(df_netflix['id'])

    # --- Clean reviews ---
    df_clean = df_reviews[df_reviews['id'].isin(netflix_ids)].copy()
    df_clean['reviewText'] = df_clean['reviewText'].astype(str).str.strip()

    df_clean['reviewText'] = (
        df_clean['reviewText']
        .apply(html.unescape)
        .str.replace(r'<[^>]+>', '', regex=True)                        # HTML tags
        .str.replace(r'http\S+|www\S+', '', regex=True)                 # URLs
        .str.replace(r'\[Full Review in [^\]]+\]', '', regex=True)      # Language notices
        .str.replace(r'[\u201c\u201d]', '"', regex=True)                # Smart double quotes
        .str.replace(r'[\u2018\u2019]', "'", regex=True)                # Smart single quotes
        .str.replace(r'\s+', ' ', regex=True)                           # Whitespace
        .str.strip()
    )

    # --- Quality filters ---
    df_clean = df_clean[df_clean['reviewText'].str.len() >= 50]
    df_clean = df_clean[
        df_clean['reviewText'].apply(lambda x: sum(c.isascii() for c in x) / len(x) >= 0.9)
    ]

    # --- Deduplicate ---
    before = len(df_clean)
    df_clean = df_clean.drop_duplicates(subset=['reviewId'])
    df_clean = df_clean.drop_duplicates(subset=['reviewText'])
    after = len(df_clean)
    if before != after:
        print(f"  Removed {before - after} duplicate reviews.")

    # --- Select and rename columns ---
    df_clean = (
        df_clean
        .rename(columns={'creationDate': 'reviewDate'})
        .reset_index(drop=True)
        [['id', 'reviewId', 'reviewDate', 'criticName', 'reviewText']]
    )

    # --- Filter for movies with enough reviews ---
    review_counts = df_clean.groupby('id').size().reset_index(name='review_count')
    df_netflix_filtered = df_netflix.merge(review_counts, on='id')
    df_netflix_filtered = df_netflix_filtered[df_netflix_filtered['review_count'] >= min_reviews]

    df_merged = df_netflix_filtered.merge(df_clean, on='id')

    print(f"  {len(df_netflix_filtered)} movies with >= {min_reviews} reviews.")
    print(f"  {len(df_merged)} total reviews ready for extraction.")

    return df_merged

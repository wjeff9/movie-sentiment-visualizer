"""
main.py — Entrypoint for the movie sentiment extraction pipeline.
"""

from dotenv import load_dotenv

from elt import load_data, transform
from sentiment import run_extraction

load_dotenv()


if __name__ == '__main__':
    print('Loading data...')
    df_movies, df_reviews = load_data()

    print('Transforming data...')
    df_netflix_reviews = transform(df_movies, df_reviews)

    # Limit to the top N movies with the most reviews
    TOP_N = 5
    top_movies = (
        df_netflix_reviews.groupby('id').size()
        .nlargest(TOP_N).index
    )
    df_netflix_reviews = df_netflix_reviews[df_netflix_reviews['id'].isin(top_movies)]

    print(f'Extracting triplets from {len(df_netflix_reviews)} reviews across {len(top_movies)} movies...')
    run_extraction(df_netflix_reviews)
    print('Done.')

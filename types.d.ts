export interface PlaceReview {
  /**
   * The aspects rated by the review. The ratings on a scale of 0 to 3.
   * @deprecated This field is no longer available.
   */
  aspects?: google.maps.places.PlaceAspectRating[];
  /**
   * The name of the reviewer.
   */
  author_name: string;
  /**
   * A URL to the reviewer&#39;s profile. This will be <code>undefined</code>
   * when the reviewer&#39;s profile is unavailable.
   */
  author_url?: string;
  /**
   * An IETF language code indicating the language in which this review is
   * written. Note that this code includes only the main language tag without
   * any secondary tag indicating country or region. For example, all the
   * English reviews are tagged as <code>'en'</code> rather than
   * &#39;en-AU&#39; or
   * &#39;en-UK&#39;.
   */
  language: string;
  /**
   * A URL to the reviwer&#39;s profile image.
   */
  profile_photo_url: string;
  /**
   * The rating of this review, a number between 1.0 and 5.0 (inclusive).
   */
  rating?: number;
  /**
   * A string of formatted recent time, expressing the review time relative to
   * the current time in a form appropriate for the language and country. For
   * example <code>&quot;a month ago&quot;</code>.
   */
  relative_time_description: string;
  /**
   * The text of a review.
   */
  text: string;
  /**
   * Timestamp for the review, expressed in seconds since epoch.
   */
  time: number;
}
// Proves user is within radius R of venue without revealing exact location.
// Coordinates use signed, 6-decimal fixed-point integers. The integer types make
// every intermediate range-constrained instead of relying on raw field arithmetic.

fn main(
    // Private inputs (user's secret location)
    user_lat: i64,
    user_lon: i64,
    // A private copy gives event_id a real equality constraint. A proof generated
    // for one public event cannot be replayed after mutating that public input.
    event_witness: Field,
    // Public inputs (venue location and radius)
    venue_lat: pub i64,
    venue_lon: pub i64,
    threshold_sq: pub u64,
    // Public input (event binding)
    event_id: pub Field,
) {
    assert(user_lat >= -90_000_000 & user_lat <= 90_000_000, "Invalid user latitude");
    assert(venue_lat >= -90_000_000 & venue_lat <= 90_000_000, "Invalid venue latitude");
    assert(user_lon >= -180_000_000 & user_lon <= 180_000_000, "Invalid user longitude");
    assert(venue_lon >= -180_000_000 & venue_lon <= 180_000_000, "Invalid venue longitude");
    assert(threshold_sq > 0, "Threshold must be positive");
    assert(event_witness == event_id, "Event binding mismatch");

    // Calculate coordinate differences
    let delta_lat = user_lat - venue_lat;
    let delta_lon = user_lon - venue_lon;

    // Euclidean distance squared: d^2 = dx^2 + dy^2
    let distance_sq = delta_lat * delta_lat + delta_lon * delta_lon;

    // Prove user is within allowed radius
    assert((distance_sq as u64) < threshold_sq, "User is outside the allowed radius");
}

#[test]
fn test_user_at_venue() {
    main(37774900, -122419400, 1, 37774900, -122419400, 807000000, 1);
}

#[test]
fn test_user_within_radius() {
    // User ~11m away from venue
    main(37775000, -122419500, 2, 37774900, -122419400, 807000000, 2);
}

#[test(should_fail_with = "User is outside the allowed radius")]
fn test_user_outside_radius() {
    // User far from venue, threshold smaller than distance_sq
    main(37784900, -122429400, 3, 37774900, -122419400, 100000000, 3);
}

#[test]
fn test_user_at_boundary() {
    // distance_sq = 720000, threshold = 720001
    main(600, 600, 4, 0, 0, 720001, 4);
}

#[test(should_fail_with = "User is outside the allowed radius")]
fn test_user_just_outside_boundary() {
    // distance_sq = 720000, threshold = 720000 (fails because < not <=)
    main(600, 600, 5, 0, 0, 720000, 5);
}

#[test(should_fail_with = "Event binding mismatch")]
fn test_mutated_event_id_fails() {
    main(0, 0, 6, 0, 0, 1, 7);
}

#[test(should_fail_with = "Invalid user latitude")]
fn test_invalid_latitude_fails() {
    main(90_000_001, 0, 8, 0, 0, 1, 8);
}

#[test(should_fail_with = "Invalid user longitude")]
fn test_invalid_longitude_fails() {
    main(0, 180_000_001, 9, 0, 0, 1, 9);
}

#[test(should_fail_with = "Threshold must be positive")]
fn test_zero_threshold_fails() {
    main(0, 0, 10, 0, 0, 0, 10);
}

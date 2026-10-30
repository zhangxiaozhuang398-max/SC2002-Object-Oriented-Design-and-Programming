package restaurantrush;

public final class GameResult {

    /**
     * The three victory targets of assignment Section 2.1, extracted into named
     * constants so the rule below and every boundary that displays them (CLI and
     * web UI) read the same numbers from one place.
     */
    public static final int PAID_TARGET = 4;
    public static final int REVENUE_TARGET_CENTS = 4500;
    public static final int SATISFACTION_TARGET = 60;

    private final boolean victory;
    private final int paidCount;
    private final int revenueCents;
    private final String average;
    public GameResult(GameState state) {
        paidCount = state.getPaidCount();
        revenueCents = state.getRevenueCents();
        average = state.averageSatisfactionText();
        victory = paidCount >= PAID_TARGET && revenueCents >= REVENUE_TARGET_CENTS
            && state.getPaidSatisfactionSum() >= SATISFACTION_TARGET * paidCount;
    }
    public boolean isVictory() { return victory; }
    public String describe() {
        return (victory ? "VICTORY" : "DEFEAT") + " | paid " + paidCount + "/" + PAID_TARGET
            + " | revenue " + Money.format(revenueCents) + "/" + Money.format(REVENUE_TARGET_CENTS)
            + " | average paid satisfaction " + average + "/" + SATISFACTION_TARGET;
    }
}

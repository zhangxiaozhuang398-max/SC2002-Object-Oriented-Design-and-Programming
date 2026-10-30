package restaurantrush.ui;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders the engine's messages and turn events in the language the player chose.
 *
 * <p>The domain and control classes raise their messages in English, which is what the
 * command-line interface shows. The web boundary is bilingual, so it re-renders those
 * same sentences in Chinese when the page is in Chinese. This class only holds text:
 * no rule, no check and no decision lives here, and an unrecognised message simply
 * falls back to the engine's own wording instead of failing.</p>
 */
final class Messages {

    /** Status names that appear inside messages, so a sentence does not mix languages. */
    private static final Map<String, String> STATUS = Map.ofEntries(
            Map.entry("PLACED", "已下单"),
            Map.entry("PREPARING", "制作中"),
            Map.entry("READY", "可上菜"),
            Map.entry("SERVED", "已上菜"),
            Map.entry("PAID", "已付款"),
            Map.entry("CANCELLED", "已取消"),
            Map.entry("WAITING", "排队中"),
            Map.entry("SEATED", "已落座"),
            Map.entry("WAITING_FOR_FOOD", "等餐中"),
            Map.entry("EATING", "用餐中"),
            Map.entry("READY_TO_PAY", "待付款"),
            Map.entry("LEFT", "已离店"));

    /** Menu item names that appear inside messages. */
    private static final Map<String, String> DISHES = Map.of(
            "Burger", "汉堡",
            "Salad", "沙拉",
            "Pasta", "意面",
            "Salad + Pasta Combo", "沙拉 + 意面套餐");

    private Messages() {
    }

    /** @return {@code zh} for Chinese, {@code en} for anything else. */
    static String normalise(String lang) {
        return "zh".equalsIgnoreCase(lang) ? "zh" : "en";
    }

    /**
     * Renders one message in the requested language.
     *
     * @param text the English text produced by the engine (may be null)
     * @return the Chinese rendering when one is known, otherwise the original text
     */
    static String localise(String text, String lang) {
        if (text == null || !"zh".equals(normalise(lang))) {
            return text;
        }
        for (int i = 0; i < RULES.size(); i++) {
            Rule rule = RULES.get(i);
            Matcher matcher = rule.pattern.matcher(text);
            if (matcher.matches()) {
                return render(matcher, rule.chinese);
            }
        }
        return text;
    }

    private static String render(Matcher matcher, String template) {
        String out = template;
        for (int group = 1; group <= matcher.groupCount(); group++) {
            String value = matcher.group(group);
            out = out.replace("{" + group + "}", value == null ? "" : word(value));
        }
        return out;
    }

    /** Translates a bare status or dish name; other values pass through unchanged. */
    private static String word(String value) {
        String translated = STATUS.get(value);
        if (translated == null) {
            translated = DISHES.get(value);
        }
        return translated == null ? value : translated;
    }

    private static Rule rule(String regex, String chinese) {
        return new Rule(Pattern.compile(regex), chinese);
    }

    private static final class Rule {
        private final Pattern pattern;
        private final String chinese;

        private Rule(Pattern pattern, String chinese) {
            this.pattern = pattern;
            this.chinese = chinese;
        }
    }

    /** Specific sentences first: a broad pattern must not swallow a narrower one. */
    private static final List<Rule> RULES = List.of(
            // ---- what the staff report after a successful action ----
            rule("Host seated customer (\\d+)\\.",
                    "迎宾安排顾客 #{1} 落座。"),
            rule("Waiter seated customer (\\d+)\\.",
                    "服务员安排顾客 #{1} 落座。"),
            rule("Waiter served order (\\d+)\\. Customer (\\d+) is eating\\.",
                    "服务员上了订单 #{1}，顾客 #{2} 开始用餐。"),
            rule("Customer (\\d+) chose (.+?)\\. Order (\\d+): (\\$[\\d.]+), (\\d+) preparation unit\\(s\\)\\.",
                    "顾客 #{1} 点了{2}。订单 #{3}：{4}，需要 {5} 个准备单位。"),
            rule("Chef advanced order (\\d+): (\\d+)/(\\d+), ([A-Z_]+)\\.",
                    "厨师推进了订单 #{1}：{2}/{3}，状态{4}。"),
            rule("Host waits\\.",
                    "迎宾选择等待。"),
            rule("Waiter waits\\.",
                    "服务员选择等待。"),
            rule("Chef waits\\.",
                    "厨师选择等待。"),

            // ---- turn boundaries ----
            rule("Turn started\\.",
                    "回合开始。"),
            rule("Turn (\\d+) finished\\.",
                    "第 {1} 回合结束。"),
            rule("Happy Hour activated for this turn\\.",
                    "本回合开启欢乐时光。"),
            rule("New game started\\.",
                    "新的一局开始。"),
            rule("Undid the last step\\.",
                    "已撤销上一步。"),
            rule("Nothing to undo yet\\.",
                    "已经回到最开始，没有可以撤销的操作了。"),

            // ---- end-of-turn events ----
            rule("Customer (\\d+) is READY_TO_PAY; payment is possible next turn\\.",
                    "顾客 #{1} 用餐完毕（待付款），下一回合起可以收钱。"),
            rule("Cashier collected (\\$[\\d.]+) from customer (\\d+); table released\\.",
                    "收银员向顾客 #{2} 收取 {1}，桌子已空出。"),
            rule("Customer (\\d+) left unhappy; any unserved order was cancelled\\.",
                    "顾客 #{1} 满意度归零离店，未完成的订单已取消。"),

            // ---- refused actions: the messages the player sees most often ----
            rule("Start a turn first\\.",
                    "请先开始这一回合。"),
            rule("Cannot start another turn now\\.",
                    "现在不能开始新的回合。"),
            rule("Assign the Host before the Waiter\\.",
                    "请先安排迎宾，再安排服务员。"),
            rule("Assign the Waiter before the Chef\\.",
                    "请先安排服务员，再安排厨师。"),
            rule("Assign both staff, or choose Wait\\.",
                    "三个岗位都要做出选择，或者都选等待。"),
            rule("The Host has already used this turn's task\\.",
                    "迎宾本回合的任务已经用过了。"),
            rule("The Waiter has already used this turn's task\\.",
                    "服务员本回合的任务已经用过了。"),
            rule("The Chef has already used this turn's task\\.",
                    "厨师本回合的任务已经用过了。"),
            rule("Choose a Waiter task\\.",
                    "请选择服务员的任务。"),
            rule("Unknown Waiter task\\.",
                    "无法识别的服务员任务。"),
            rule("The result is checked only after turn 18\\.",
                    "胜负只在第 18 回合结束后判定。"),
            rule("Happy Hour can be activated only once per game\\.",
                    "欢乐时光一局只能开启一次。"),
            rule("This customer is not in the waiting queue\\.",
                    "这位顾客不在等待队列里。"),
            rule("Both tables are occupied\\.",
                    "两张桌子都被占用了。"),
            rule("This customer already ordered\\.",
                    "这位顾客已经下过单了。"),
            rule("This customer cannot pay until a later turn\\.",
                    "这位顾客还不能付款。"),
            rule("The customer and order are not ready for payment\\.",
                    "顾客或订单还没到可以付款的状态。"),
            rule("Only a seated customer without an order can order\\.",
                    "只有已落座、且还没下单的顾客可以点单。"),
            rule("The customer's dish must already be READY when the Waiter acts\\.",
                    "上菜要求这道菜在服务员动手时已经是 READY；本轮刚做好的菜要下一回合才能上。"),
            rule("No customer with ID (\\d+)\\.",
                    "没有 ID 为 {1} 的顾客。"),
            rule("No order with ID (\\d+)\\.",
                    "没有 ID 为 {1} 的订单。"),
            rule("Order (\\d+) cannot be prepared: ([A-Z_]+)\\.",
                    "订单 #{1} 无法继续准备：当前状态{2}。"),
            rule("Order (\\d+) is ([A-Z_]+), expected ([A-Z_]+)\\.",
                    "订单 #{1} 当前是{2}，需要是{3}。"),
            rule("Only an unserved order can be cancelled\\.",
                    "只有还没上菜的订单可以取消。"),
            rule("Table (\\d+) is already occupied by (.+)\\.",
                    "{1} 号桌已经被 {2} 占用。"),
            rule("Table (\\d+) is occupied\\.",
                    "{1} 号桌已被占用。"),
            rule("The table is released only after payment or departure\\.",
                    "桌子只会在顾客付款或离店后空出来。"),
            rule("Customer (\\d+) is ([A-Z_]+), expected ([A-Z_]+)\\.",
                    "顾客 #{1} 当前是{2}，需要是{3}。"),
            rule("Customer has not left\\.",
                    "这位顾客还没有离店。"),
            rule("Unknown action type: (.*)",
                    "无法识别的操作类型：{1}"));
}

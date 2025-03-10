"use strict";

const {strict: assert} = require("assert");

const {mock_esm, zrequire} = require("../zjsunit/namespace");
const {run_test} = require("../zjsunit/test");

const all_messages_data = mock_esm("../../static/js/all_messages_data");

const {Filter} = zrequire("../js/filter");
const {MessageListData} = zrequire("../js/message_list_data");
const narrow_state = zrequire("narrow_state");
const narrow = zrequire("narrow");

function test_with(fixture) {
    const filter = new Filter(fixture.filter_terms);
    narrow_state.set_current_filter(filter);

    // Make sure our simulated tests data satisfies the
    // invarariant that the first unread message we find
    // does indeed satisfy our filter.
    if (fixture.unread_info.flavor === "found") {
        for (const msg of fixture.all_messages) {
            if (msg.id === fixture.unread_info.msg_id) {
                assert(filter.predicate()(msg));
            }
        }
    }

    const excludes_muted_topics = narrow_state.excludes_muted_topics();
    const msg_data = new MessageListData({
        filter: narrow_state.filter(),
        excludes_muted_topics,
    });
    const id_info = {
        target_id: fixture.target_id,
        local_select_id: undefined,
        final_select_id: undefined,
    };

    all_messages_data.all_messages_data = {
        fetch_status: {
            has_found_newest: () => fixture.has_found_newest,
        },
        empty: () => fixture.empty,
        all_messages: () => {
            assert.notEqual(fixture.all_messages, undefined);
            return fixture.all_messages;
        },
        first: () => {
            assert.notEqual(fixture.all_messages, undefined);
            return fixture.all_messages[0];
        },
        last: () => {
            assert.notEqual(fixture.all_messages, undefined);
            return fixture.all_messages[fixture.all_messages.length - 1];
        },
    };

    narrow_state.__Rewire__("get_first_unread_info", () => fixture.unread_info);

    narrow.maybe_add_local_messages({
        id_info,
        msg_data,
    });

    assert.deepEqual(id_info, fixture.expected_id_info);

    const msgs = msg_data.all_messages();
    const msg_ids = msgs.map((message) => message.id);
    assert.deepEqual(msg_ids, fixture.expected_msg_ids);
}

run_test("near after unreads", () => {
    // Current near: behavior is to ignore the unreads and take you
    // to the target message, with reading disabled.
    const fixture = {
        filter_terms: [{operator: "near", operand: 42}],
        target_id: 42,
        unread_info: {
            flavor: "found",
            msg_id: 37,
        },
        has_found_newest: false,
        all_messages: [
            {id: 37, topic: "whatever"},
            {id: 42, topic: "whatever"},
            {id: 44, topic: "whatever"},
        ],
        expected_id_info: {
            target_id: 42,
            final_select_id: 42,
            local_select_id: 42,
        },
        expected_msg_ids: [37, 42, 44],
    };

    test_with(fixture);
});

run_test("near not in message list", () => {
    // Current behavior is to ignore the unreads and take you
    // to the closest messages, with reading disabled.
    const fixture = {
        filter_terms: [{operator: "near", operand: 42}],
        target_id: 42,
        unread_info: {
            flavor: "found",
            msg_id: 46,
        },
        has_found_newest: false,
        all_messages: [
            {id: 41, topic: "whatever"},
            {id: 45, topic: "whatever"},
            {id: 46, topic: "whatever"},
        ],
        expected_id_info: {
            target_id: 42,
            final_select_id: 42,
            local_select_id: undefined,
        },
        expected_msg_ids: [41, 45, 46],
    };

    test_with(fixture);
});

run_test("near before unreads", () => {
    const fixture = {
        filter_terms: [{operator: "near", operand: 42}],
        target_id: 42,
        unread_info: {
            flavor: "found",
            msg_id: 43,
        },
        has_found_newest: false,
        all_messages: [
            {id: 42, topic: "whatever"},
            {id: 43, topic: "whatever"},
            {id: 44, topic: "whatever"},
        ],
        expected_id_info: {
            target_id: 42,
            final_select_id: 42,
            local_select_id: 42,
        },
        expected_msg_ids: [42, 43, 44],
    };

    test_with(fixture);
});

run_test("near with no unreads", () => {
    const fixture = {
        filter_terms: [{operator: "near", operand: 42}],
        target_id: 42,
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: false,
        empty: true,
        expected_id_info: {
            target_id: 42,
            final_select_id: 42,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("is private with no target", () => {
    const fixture = {
        filter_terms: [{operator: "is", operand: "private"}],
        unread_info: {
            flavor: "found",
            msg_id: 550,
        },
        has_found_newest: true,
        all_messages: [
            {id: 450, type: "private", to_user_ids: "1,2"},
            {id: 500, type: "private", to_user_ids: "1,2"},
            {id: 550, type: "private", to_user_ids: "1,2"},
        ],
        expected_id_info: {
            target_id: undefined,
            final_select_id: 550,
            local_select_id: 550,
        },
        expected_msg_ids: [450, 500, 550],
    };

    test_with(fixture);
});

run_test("pm-with with target outside of range", () => {
    const fixture = {
        filter_terms: [{operator: "pm-with", operand: "alice@example.com"}],
        target_id: 5,
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: false,
        all_messages: [{id: 999}],
        expected_id_info: {
            target_id: 5,
            final_select_id: 5,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("is:private with no unreads before fetch", () => {
    const fixture = {
        filter_terms: [{operator: "is", operand: "private"}],
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: false,
        empty: true,
        expected_id_info: {
            target_id: undefined,
            final_select_id: undefined,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("is:private with target and no unreads", () => {
    const fixture = {
        filter_terms: [{operator: "is", operand: "private"}],
        target_id: 450,
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: true,
        empty: false,
        all_messages: [
            {id: 350},
            {id: 400, type: "private", to_user_ids: "1,2"},
            {id: 450, type: "private", to_user_ids: "1,2"},
            {id: 500, type: "private", to_user_ids: "1,2"},
        ],
        expected_id_info: {
            target_id: 450,
            final_select_id: 450,
            local_select_id: 450,
        },
        expected_msg_ids: [400, 450, 500],
    };

    test_with(fixture);
});

run_test("is:mentioned with no unreads and no matches", () => {
    const fixture = {
        filter_terms: [{operator: "is", operand: "mentioned"}],
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: true,
        all_messages: [],
        expected_id_info: {
            target_id: undefined,
            final_select_id: undefined,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("is:alerted with no unreads and one match", () => {
    const fixture = {
        filter_terms: [{operator: "is", operand: "alerted"}],
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: true,
        all_messages: [
            {id: 55, topic: "whatever", alerted: true},
            {id: 57, topic: "whatever", alerted: false},
        ],
        expected_id_info: {
            target_id: undefined,
            final_select_id: 55,
            local_select_id: 55,
        },
        expected_msg_ids: [55],
    };

    test_with(fixture);
});

run_test("search", () => {
    const fixture = {
        filter_terms: [{operator: "search", operand: "whatever"}],
        unread_info: {
            flavor: "cannot_compute",
        },
        expected_id_info: {
            target_id: undefined,
            final_select_id: 10000000000000000,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("search near", () => {
    const fixture = {
        filter_terms: [
            {operator: "search", operand: "whatever"},
            {operator: "near", operand: 22},
        ],
        target_id: 22,
        unread_info: {
            flavor: "cannot_compute",
        },
        expected_id_info: {
            target_id: 22,
            final_select_id: 22,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("stream, no unread, not in all_messages", () => {
    // This might be something you'd see zooming out from
    // a muted topic, maybe?  It's possibly this scenario
    // is somewhat contrived, but we exercise fairly simple
    // defensive code that just punts when messages aren't in
    // our new message list.  Note that our target_id is within
    // the range of all_messages.
    const fixture = {
        filter_terms: [{operator: "stream", operand: "whatever"}],
        target_id: 450,
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: true,
        empty: false,
        all_messages: [{id: 400}, {id: 500}],
        expected_id_info: {
            target_id: 450,
            final_select_id: 450,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("search, stream, not in all_messages", () => {
    const fixture = {
        filter_terms: [
            {operator: "search", operand: "foo"},
            {operator: "stream", operand: "whatever"},
        ],
        unread_info: {
            flavor: "cannot_compute",
        },
        has_found_newest: true,
        empty: false,
        all_messages: [{id: 400}, {id: 500}],
        expected_id_info: {
            target_id: undefined,
            final_select_id: 10000000000000000,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("stream/topic not in all_messages", () => {
    // This is a bit of a corner case, but you could have a scenario
    // where you've gone way back in a topic (perhaps something that
    // has been muted a long time) and find an unread message that isn't
    // actually in all_messages_data.
    const fixture = {
        filter_terms: [
            {operator: "stream", operand: "one"},
            {operator: "topic", operand: "whatever"},
        ],
        target_id: 1000,
        unread_info: {
            flavor: "found",
            msg_id: 2,
        },
        has_found_newest: true,
        all_messages: [{id: 900}, {id: 1100}],
        expected_id_info: {
            target_id: 1000,
            final_select_id: 2,
            local_select_id: undefined,
        },
        expected_msg_ids: [],
    };

    test_with(fixture);
});

run_test("final corner case", () => {
    // This tries to get all the way to the end of
    // the function (as written now).  The data here
    // may be completely contrived.
    const fixture = {
        filter_terms: [{operator: "is", operand: "starred"}],
        target_id: 450,
        unread_info: {
            flavor: "not_found",
        },
        has_found_newest: true,
        empty: false,
        all_messages: [
            {id: 400, topic: "whatever"},
            {id: 425, topic: "whatever", starred: true},
            {id: 500, topic: "whatever"},
        ],
        expected_id_info: {
            target_id: 450,
            final_select_id: 450,
            local_select_id: undefined,
        },
        expected_msg_ids: [425],
    };

    test_with(fixture);
});

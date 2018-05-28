import { formatIsoDay } from '../datelib/utils'


// this function has been mangled to work with external jqui draggables as well
export function testEventDrag(options, dropDate, expectSuccess, callback, eventClassName) {
  var eventsRendered = false

  options.editable = true
  options.eventAfterAllRender = function() {
    var calendar = currentCalendar
    var isDraggingExternal = false
    var dayEl
    var eventEl
    var dragEl
    var slatIndex
    var slatEl
    var dx, dy
    var allowed

    if (eventsRendered) { return }
    eventsRendered = true

    var dropDateMeta
    var dropDateHasTime
    if (typeof dropDate === 'string') {
      dropDateMeta = FullCalendar.parseMarker(dropDate)
      dropDateHasTime = !dropDateMeta.isTimeUnspecified
      dropDate = dropDateMeta.marker
    } else {
      dropDateHasTime = true
    }

    eventEl = $('.' + (eventClassName || 'fc-event') + ':first')
    expect(eventEl.length).toBe(1)

    if (dropDateHasTime) {
      dragEl = eventEl.find('.fc-time')
      dayEl = $('.fc-time-grid .fc-day[data-date="' + formatIsoDay(dropDate) + '"]')
      slatIndex = dropDate.getUTCHours() * 2 + (dropDate.getUTCMinutes() / 30) // assumes slotDuration:'30:00'
      slatEl = $('.fc-slats tr:eq(' + slatIndex + ')')
      expect(slatEl.length).toBe(1)
      dy = slatEl.offset().top - eventEl.offset().top
    } else {
      dragEl = eventEl.find('.fc-title')
      dayEl = $('.fc-day-grid .fc-day[data-date="' + formatIsoDay(dropDate) + '"]')
      dy = dayEl.offset().top - eventEl.offset().top
    }

    if (!dragEl.length) {
      isDraggingExternal = true
      dragEl = eventEl // well, not really an "event" element anymore
    }

    expect(dragEl.length).toBe(1)
    expect(dayEl.length).toBe(1)
    dx = dayEl.offset().left - eventEl.offset().left

    dragEl.simulate('drag', {
      dx: dx,
      dy: dy,
      onBeforeRelease: function() {
        allowed = !$('body').hasClass('fc-not-allowed')
        expect(allowed).toBe(expectSuccess)
      },
      onRelease: function() {
        var eventObj
        var successfulDrop

        if (!isDraggingExternal) { // if dragging an event within the calendar, check dates

          if (eventClassName) {
            eventObj = calendar.clientEvents(function(o) {
              return o.className.join(' ') === eventClassName
            })[0]
          } else {
            eventObj = calendar.clientEvents()[0]
          }

          if (dropDateHasTime) { // dropped on a slot
            successfulDrop = eventObj.start.valueOf() === dropDate.valueOf() // compare exact times
          } else { // dropped on a whole day
            // only compare days
            successfulDrop = formatIsoDay(eventObj.start) === formatIsoDay(dropDate)
          }

          expect(successfulDrop).toBe(allowed)
          expect(successfulDrop).toBe(expectSuccess)
        }

        callback()
      }
    })
  }
  initCalendar(options)
}


export function testEventResize(options, resizeDate, expectSuccess, callback, eventClassName) {
  var eventsRendered = false

  options.editable = true
  options.eventAfterAllRender = function() {
    var calendar = currentCalendar
    var lastDayEl
    var lastSlatIndex
    var lastSlatEl
    var eventEl
    var dragEl
    var dx, dy
    var allowed

    if (eventsRendered) { return }
    eventsRendered = true

    var resizeDateMeta
    var resizeDateHasTime
    if (typeof resizeDate === 'string') {
      resizeDateMeta = FullCalendar.parseMarker(resizeDate)
      resizeDateHasTime = !resizeDateMeta.isTimeUnspecified
      resizeDate = resizeDateMeta.marker
    } else {
      resizeDateHasTime = true
    }

    eventEl = $('.' + (eventClassName || 'fc-event') + ':last')
    dragEl = eventEl.find('.fc-resizer')

    if (resizeDateHasTime) {
      lastDayEl = $('.fc-time-grid .fc-day[data-date="' + formatIsoDay(resizeDate) + '"]')
      lastSlatIndex = resizeDate.getUTCHours() * 2 + (resizeDate.getUTCMinutes() / 30) // assumes slotDuration:'30:00'
      lastSlatEl = $('.fc-slats tr:eq(' + (lastSlatIndex - 1) + ')')
      expect(lastSlatEl.length).toBe(1)
      dy = lastSlatEl.offset().top + lastSlatEl.outerHeight() - (eventEl.offset().top + eventEl.outerHeight())
    } else {
      lastDayEl = $('.fc-day-grid .fc-day[data-date="' + formatIsoDay(FullCalendar.addDays(resizeDate, -1)) + '"]')
      dy = lastDayEl.offset().top - eventEl.offset().top
    }

    expect(lastDayEl.length).toBe(1)
    expect(eventEl.length).toBe(1)
    expect(dragEl.length).toBe(1)
    dx = lastDayEl.offset().left + lastDayEl.outerWidth() - 2 - (eventEl.offset().left + eventEl.outerWidth())

    dragEl.simulate('mouseover') // resizer only shows up on mouseover
    dragEl.simulate('drag', {
      dx: dx,
      dy: dy,
      onBeforeRelease: function() {
        allowed = !$('body').hasClass('fc-not-allowed')
      },
      onRelease: function() {
        var eventObj
        var successfulDrop

        if (eventClassName) {
          eventObj = calendar.clientEvents(function(o) {
            return o.className.join(' ') === eventClassName
          })[0]
        } else {
          eventObj = calendar.clientEvents()[0]
        }

        successfulDrop = eventObj.end && eventObj.end.valueOf() === resizeDate.valueOf()

        expect(allowed).toBe(successfulDrop)
        expect(allowed).toBe(expectSuccess)
        expect(successfulDrop).toBe(expectSuccess)
        callback()
      }
    })
  }
  initCalendar(options)
}


export function testSelection(options, start, end, expectSuccess, callback) {
  var successfulSelection = false
  var firstDayEl, lastDayEl
  var firstSlatIndex, lastSlatIndex
  var firstSlatEl, lastSlatEl
  var dx, dy
  var dragEl
  var allowed

  var isAllDay = false
  var meta
  if (typeof start === 'string') {
    meta = FullCalendar.parseMarker(start)
    isAllDay = isAllDay || meta.isTimeUnspecified
    start = meta.marker
  }
  if (typeof end === 'string') {
    meta = FullCalendar.parseMarker(end)
    isAllDay = isAllDay || meta.isTimeUnspecified
    end = meta.marker
  }

  options.selectable = true
  options.select = function(arg) {
    successfulSelection =
      arg.isAllDay === isAllDay &&
      arg.start.valueOf() === start.valueOf() &&
      arg.end.valueOf() === end.valueOf()
  }
  spyOn(options, 'select').and.callThrough()
  initCalendar(options)

  if (!isAllDay) {
    firstDayEl = $('.fc-time-grid .fc-day[data-date="' + formatIsoDay(start) + '"]')
    lastDayEl = $('.fc-time-grid .fc-day[data-date="' + formatIsoDay(end) + '"]')
    firstSlatIndex = start.getUTCHours() * 2 + (start.getUTCMinutes() / 30) // assumes slotDuration:'30:00'
    lastSlatIndex = end.getUTCHours() * 2 + (end.getUTCMinutes() / 30) - 1 // assumes slotDuration:'30:00'
    firstSlatEl = $('.fc-slats tr:eq(' + firstSlatIndex + ')')
    lastSlatEl = $('.fc-slats tr:eq(' + lastSlatIndex + ')')
    expect(firstSlatEl.length).toBe(1)
    expect(lastSlatEl.length).toBe(1)
    dy = lastSlatEl.offset().top - firstSlatEl.offset().top
    dragEl = firstSlatEl
  } else {
    firstDayEl = $('.fc-day-grid .fc-day[data-date="' + formatIsoDay(start) + '"]')
    lastDayEl = $('.fc-day-grid .fc-day[data-date="' + formatIsoDay(new Date(end.valueOf() - 1)) + '"]') // inclusive
    dy = lastDayEl.offset().top - firstDayEl.offset().top
    dragEl = firstDayEl
  }

  expect(firstDayEl.length).toBe(1)
  expect(lastDayEl.length).toBe(1)
  dx = lastDayEl.offset().left - firstDayEl.offset().left

  dragEl.simulate('drag', {
    dx: dx,
    dy: dy,
    onBeforeRelease: function() {
      allowed = !$('body').hasClass('fc-not-allowed')
    },
    onRelease: function() {
      if (expectSuccess) {
        expect(options.select).toHaveBeenCalled()
      }
      expect(expectSuccess).toBe(allowed)
      expect(expectSuccess).toBe(successfulSelection)
      expect(allowed).toBe(successfulSelection)
      callback()
    }
  })
}

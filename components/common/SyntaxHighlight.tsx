"use client"

export const SyntaxHighlightedCSS = ({ css }: { css: string }) => {
  const highlightCSS = (code: string) => {
    return code.split("\n").map((line, i) => {
      // Highlight comments
      if (line.trim().startsWith("/*")) {
        return (
          <div key={i} className="text-green-400">
            {line}
          </div>
        )
      }
      // Highlight selectors
      if (line.includes("{") && !line.includes(":")) {
        return (
          <div key={i} className="text-blue-400 font-semibold">
            {line}
          </div>
        )
      }
      // Highlight properties and values
      if (line.includes(":")) {
        const [property, ...valueParts] = line.split(":")
        const value = valueParts.join(":")
        return (
          <div key={i}>
            <span className="text-purple-400">{property}</span>
            <span className="text-gray-400">:</span>
            <span className="text-orange-400">{value}</span>
          </div>
        )
      }
      // Default
      return <div key={i}>{line || "\u00A0"}</div>
    })
  }

  return (
    <pre className="font-mono text-xs min-h-[400px] text-white p-4 rounded-lg overflow-auto whitespace-pre-wrap break-words" style={{ backgroundColor: "#21292C" }}>
      {highlightCSS(css)}
    </pre>
  )
}

export const SyntaxHighlightedHTML = ({ html }: { html: string }) => {
  const highlightHTML = (code: string) => {
    const lines = code.split("\n")
    return lines.map((line, i) => {
      let result: React.ReactNode[] = []

      // Process line character by character for syntax highlighting
      const regex = /(<[^>]*>)|(".*?")|('.*?')|(&lt;!--.*?--&gt;)/g
      let lastIndex = 0
      let match

      while ((match = regex.exec(line)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          result.push(
            <span key={`text-${i}-${lastIndex}`} className="text-gray-300">
              {line.substring(lastIndex, match.index)}
            </span>
          )
        }

        // Highlight the match
        if (match[0].startsWith("<!--")) {
          result.push(
            <span key={`comment-${i}-${match.index}`} className="text-green-400">
              {match[0]}
            </span>
          )
        } else if (match[0].startsWith("<")) {
          // HTML tag - parse attributes
          const tagContent = match[0]

          // Opening bracket
          result.push(
            <span key={`bracket-${i}-${match.index}`} className="text-blue-400">
              &lt;
            </span>
          )

          const tagBody = tagContent.substring(1, tagContent.length - 1)
          const parts = tagBody.split(" ")
          const tagName = parts[0]

          // Tag name
          result.push(
            <span key={`tag-${i}-${match.index}`} className="text-blue-400">
              {tagName.replace(/\//g, "")}
            </span>
          )

          // Attributes
          const attrPart = parts.slice(1).join(" ")
          if (attrPart) {
            const attrRegex2 = /(\w+)=(".*?"|'.*?')/g
            let attr2

            while ((attr2 = attrRegex2.exec(attrPart)) !== null) {
              result.push(
                <span key={`attr-name-${i}-${attr2.index}`} className="text-purple-400">
                  {" " + attr2[1]}
                </span>
              )
              result.push(
                <span key={`attr-eq-${i}-${attr2.index}`} className="text-gray-400">
                  =
                </span>
              )
              result.push(
                <span key={`attr-val-${i}-${attr2.index}`} className="text-orange-400">
                  {attr2[2]}
                </span>
              )
            }
          }

          // Closing bracket
          result.push(
            <span key={`close-bracket-${i}-${match.index}`} className="text-blue-400">
              &gt;
            </span>
          )
        } else {
          // String or other
          result.push(
            <span key={`string-${i}-${match.index}`} className="text-orange-400">
              {match[0]}
            </span>
          )
        }

        lastIndex = match.index + match[0].length
      }

      // Add remaining text
      if (lastIndex < line.length) {
        result.push(
          <span key={`text-end-${i}`} className="text-gray-300">
            {line.substring(lastIndex)}
          </span>
        )
      }

      return (
        <div key={i} className="flex gap-2">
          <span className="text-gray-500 min-w-8 text-right">{i + 1}</span>
          <span className="flex-1">{result.length > 0 ? result : "\u00A0"}</span>
        </div>
      )
    })
  }

  return (
    <pre className="font-mono text-xs min-h-[400px] text-white p-4 rounded-lg overflow-auto bg-slate-900">
      {highlightHTML(html)}
    </pre>
  )
}
